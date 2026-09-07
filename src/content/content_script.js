/**
 * Chromy 2 - Main Content Script Controller
 * Coordinates DOM observer, cross-frame messaging, overlay rendering, and background worker search.
 */

(function () {
  if (window.MyBuddyControllerLoaded) return;
  window.MyBuddyControllerLoaded = true;

  const isTopWindow = window === window.top;
  const overlay = window.MyBuddyOverlay;
  const observer = window.MyBuddyDOMObserver;

  if (!observer) return;

  function queryAnswerForQuestion(questionData) {
    const { questionText, options, category } = questionData;

    if (overlay && isTopWindow) {
      overlay.updateDetectedQuestion(questionText);
    }

    try {
      chrome.runtime.sendMessage(
        {
          action: 'get_answer',
          question: questionText,
          options: options || [],
          category: category
        },
        (response) => {
          if (chrome.runtime.lastError) {
            if (overlay && isTopWindow) {
              overlay.updateMatchResult({
                matchFound: false,
                reason: 'Could not contact extension background worker. Refresh page.'
              });
            }
            return;
          }

          if (response && overlay && isTopWindow) {
            overlay.updateMatchResult(response);
          }
        }
      );
    } catch (err) {
      if (overlay && isTopWindow) {
        overlay.updateMatchResult({
          matchFound: false,
          reason: 'Extension reloaded. Please refresh webpage.'
        });
      }
    }
  }

  // Handle question detected by observer
  observer.onQuestionDetected = (data) => {
    if (isTopWindow) {
      // Top window: if outer frame has quiz options or no subframe message received yet
      if (data.hasQuizOptions || !window.MyBuddyReceivedSubframeQuestion) {
        queryAnswerForQuestion(data);
      }
    } else {
      // Iframe: send question data up to top window overlay controller
      if (data.hasQuizOptions || data.questionText.length > 10) {
        try {
          window.top.postMessage(
            {
              type: 'CHROMY2_IFRAME_QUESTION',
              questionData: data
            },
            '*'
          );
        } catch (e) {}
      }
    }
  };

  // Top window listens for iframe messages
  if (isTopWindow) {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CHROMY2_IFRAME_QUESTION' && event.data.questionData) {
        const iframeData = event.data.questionData;
        window.MyBuddyReceivedSubframeQuestion = true;
        queryAnswerForQuestion(iframeData);
      }
    });
  }

  // Bind manual scan request from overlay header
  if (overlay && isTopWindow) {
    overlay.onScanRequested = () => {
      observer.scanPage(true);
    };
  }

  // Start observing page DOM
  observer.start();
})();
