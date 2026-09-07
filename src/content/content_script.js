/**
 * My Buddy - Main Content Script Controller
 * Coordinates page question observation, overlay UI rendering, and background worker communications.
 */

(function () {
  if (window.MyBuddyControllerLoaded) return;
  window.MyBuddyControllerLoaded = true;

  const overlay = window.MyBuddyOverlay;
  const observer = window.MyBuddyDOMObserver;

  if (!overlay || !observer) return;

  function queryAnswerForQuestion(questionData) {
    const { questionText, category } = questionData;

    overlay.updateDetectedQuestion(questionText);

    try {
      chrome.runtime.sendMessage(
        {
          action: 'get_answer',
          question: questionText,
          category: category
        },
        (response) => {
          if (chrome.runtime.lastError) {
            overlay.updateMatchResult({
              matchFound: false,
              reason: 'Could not contact extension background worker. Refresh page.'
            });
            return;
          }

          if (response) {
            overlay.updateMatchResult(response);
          } else {
            overlay.updateMatchResult({
              matchFound: false,
              reason: 'No response from storage matcher.'
            });
          }
        }
      );
    } catch (err) {
      overlay.updateMatchResult({
        matchFound: false,
        reason: 'Extension reloaded. Please refresh webpage.'
      });
    }
  }

  // Bind DOM observer callback
  observer.onQuestionDetected = (data) => {
    queryAnswerForQuestion(data);
  };

  // Bind manual scan request from overlay header
  overlay.onScanRequested = () => {
    observer.scanPage(true);
  };

  // Start observing page DOM
  observer.start();
})();
