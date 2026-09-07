/**
 * My Buddy - High-Precision DOM Question & Option Extractor
 * Tuned for Cisco NetAcad, CyberOps Associate, SkillsForAll, and LMS quiz frames.
 * Strategy order:
 *   1. NetAcad-specific: paragraph AFTER "Question N" heading
 *   2. Proximity-to-options: text near radio/checkbox inputs
 *   3. General fallback: question-mark and keyword scan
 */

(function () {
  if (window.MyBuddyDOMObserver) return;

  class DOMQuestionObserver {
    constructor() {
      this.lastQuestionText = '';
      this.lastOptionsKey = '';
      this.lastCategoryText = '';
      this.onQuestionDetected = null;
      this.observer = null;
    }

    start() {
      this.scanPage();

      this.observer = new MutationObserver(() => {
        this.scanPage();
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      window.addEventListener('popstate', () => this.scanPage(true));
      window.addEventListener('hashchange', () => this.scanPage(true));
    }

    stop() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }

    detectActiveModuleCategory() {
      const titleSelectors = [
        '.nodeContainer--3DQo1.nodeSubSectionActive--EJiXb .nodeName--AZrtx',
        '.outlineContainer--m04EY .active .nodeName--AZrtx',
        '.courseTitle--zMkHL',
        'header .title',
        'h1', 'h2'
      ];

      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText && el.innerText.trim().length > 3) {
          const txt = el.innerText.trim();
          if (!txt.toLowerCase().includes('question')) {
            return txt;
          }
        }
      }

      return 'Checkpoint Exam';
    }

    isCookieOrPrivacyText(text) {
      const textLower = text.toLowerCase();
      const blacklistTerms = [
        'when you visit any website',
        'store or retrieve information',
        'form of cookies',
        'privacy policy',
        'terms of service',
        'cookie preferences',
        'manage preferences',
        'select a space',
        'skip to',
        'skip question',
        'search course outline',
        'skip all',
        'question 1', 'question 2', 'question 3', 'question 4', 'question 5',
        'question 6', 'question 7', 'question 8', 'question 9', 'question 10',
        'question 11', 'question 12', 'question 13', 'question 14', 'question 15',
        'question 16', 'question 17', 'question 18', 'question 19', 'question 20'
      ];

      return blacklistTerms.some(term => textLower === term.toLowerCase() || textLower.trim() === term.trim());
    }

    /**
     * Strategy 1: NetAcad-specific extraction.
     * NetAcad renders: <h2>Question 2</h2> <p>What websites...</p>
     * Find all headings that match "Question N" and return the next sibling paragraph.
     */
    extractNetAcadQuestion() {
      // Find any element whose visible text is exactly "Question N"
      const allElements = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,p,span'));

      for (const el of allElements) {
        if (el.closest('#my-buddy-overlay-root')) continue;
        const txt = (el.innerText || el.textContent || '').trim();

        // Match "Question 1", "Question 2", ... etc (and also "Q1", "Q2" etc.)
        if (/^question\s+\d+$/i.test(txt) || /^q\d+$/i.test(txt)) {
          // Look at all following siblings AND children of parent for actual question text
          let sibling = el.nextElementSibling;
          let depth = 0;
          while (sibling && depth < 5) {
            if (sibling.closest && sibling.closest('#my-buddy-overlay-root')) {
              sibling = sibling.nextElementSibling;
              depth++;
              continue;
            }
            const sibText = (sibling.innerText || sibling.textContent || '').trim();
            if (sibText.length > 10 && sibText.length < 600 && !this.isCookieOrPrivacyText(sibText)) {
              // Must look like a question or statement (not just a single short word)
              if (sibText.length > 15 || sibText.endsWith('?')) {
                return sibText;
              }
            }
            sibling = sibling.nextElementSibling;
            depth++;
          }

          // Also try: parent's next paragraph
          const parent = el.parentElement;
          if (parent) {
            let pSibling = parent.nextElementSibling;
            let pDepth = 0;
            while (pSibling && pDepth < 4) {
              if (pSibling.closest && pSibling.closest('#my-buddy-overlay-root')) {
                pSibling = pSibling.nextElementSibling;
                pDepth++;
                continue;
              }
              const pTxt = (pSibling.innerText || pSibling.textContent || '').trim();
              if (pTxt.length > 15 && pTxt.length < 600 && !this.isCookieOrPrivacyText(pTxt)) {
                return pTxt;
              }
              pSibling = pSibling.nextElementSibling;
              pDepth++;
            }

            // Check children of parent container for a paragraph
            const paragraphs = Array.from(parent.querySelectorAll('p, [class*="question"], [class*="Question"], [class*="stem"], [class*="prompt"]'));
            for (const p of paragraphs) {
              if (p.closest('#my-buddy-overlay-root')) continue;
              const pTxt = (p.innerText || p.textContent || '').trim();
              if (pTxt.length > 15 && pTxt.length < 600 && !this.isCookieOrPrivacyText(pTxt)) {
                return pTxt;
              }
            }
          }
        }
      }

      return null;
    }

    extractPageQuestionAndOptions() {
      let detectedQuestion = '';
      const detectedOptions = [];

      // === STEP 1: Extract all option choices on current page/frame ===
      const optionElements = document.querySelectorAll('label, [role="radio"], [role="checkbox"], .option, .choice, li');
      optionElements.forEach(el => {
        if (!el.closest('#my-buddy-overlay-root')) {
          const txt = (el.innerText || '').trim();
          if (txt.length > 2 && txt.length < 300 && !this.isCookieOrPrivacyText(txt) && !detectedOptions.includes(txt)) {
            detectedOptions.push(txt);
          }
        }
      });

      // === STRATEGY 1: NetAcad-specific "Question N" heading + next sibling ===
      detectedQuestion = this.extractNetAcadQuestion() || '';

      // === STRATEGY 2: Proximity to options (if Strategy 1 failed) ===
      if (!detectedQuestion && detectedOptions.length > 0) {
        const optionNode = optionElements[0];
        let parent = optionNode.parentElement;
        let depth = 0;
        while (parent && parent !== document.body && depth < 6) {
          const textNodes = Array.from(parent.querySelectorAll('h1, h2, h3, h4, h5, p, span, div'))
            .filter(el => !el.closest('#my-buddy-overlay-root') && !el.closest('label, [role="radio"], [role="checkbox"]'));

          for (const el of textNodes) {
            const txt = (el.innerText || '').trim();
            if (txt.length > 8 && txt.length < 500 && !this.isCookieOrPrivacyText(txt)) {
              if (txt.endsWith('?') || /^(which|what|why|how|when|where|who|select|choose|identify|match|true|false)\b/i.test(txt)) {
                detectedQuestion = txt;
                break;
              }
            }
          }
          if (detectedQuestion) break;
          parent = parent.parentElement;
          depth++;
        }
      }

      // === STRATEGY 3: General page scan fallback ===
      if (!detectedQuestion) {
        const allTextNodes = Array.from(
          document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, [class*="question"], [class*="Question"], [class*="prompt"], [class*="stem"]')
        ).filter(el => {
          if (el.closest('#my-buddy-overlay-root, #skiplinks, .skiplinks, .skipLinkList')) return false;
          const text = (el.innerText || '').trim();
          if (text.length < 12 || text.length > 600) return false;
          if (this.isCookieOrPrivacyText(text)) return false;
          if (el.closest('button, nav, footer, [role="navigation"]')) return false;
          return true;
        });

        // Priority: elements ending with '?'
        const questionMarkElements = allTextNodes.filter(el => (el.innerText || '').trim().endsWith('?'));
        if (questionMarkElements.length > 0) {
          questionMarkElements.sort((a, b) => (a.innerText || '').trim().length - (b.innerText || '').trim().length);
          detectedQuestion = (questionMarkElements[0].innerText || '').trim();
        }

        // Fallback: keyword-starting sentences
        if (!detectedQuestion) {
          const questionWordElements = allTextNodes.filter(el =>
            /^(which|what|why|how|when|where|who|select|choose|identify|match|true|false)\b/i.test((el.innerText || '').trim())
          );
          if (questionWordElements.length > 0) {
            questionWordElements.sort((a, b) => (a.innerText || '').trim().length - (b.innerText || '').trim().length);
            detectedQuestion = (questionWordElements[0].innerText || '').trim();
          }
        }
      }

      return {
        questionText: detectedQuestion,
        options: detectedOptions,
        hasQuizOptions: detectedOptions.length > 0
      };
    }

    scanPage(force = false) {
      const { questionText, options, hasQuizOptions } = this.extractPageQuestionAndOptions();
      const activeCategory = this.detectActiveModuleCategory();
      const optionsKey = options.slice(0, 5).join('|');

      if (force || questionText !== this.lastQuestionText || optionsKey !== this.lastOptionsKey || activeCategory !== this.lastCategoryText) {
        this.lastQuestionText = questionText;
        this.lastOptionsKey = optionsKey;
        this.lastCategoryText = activeCategory;

        if (this.onQuestionDetected && (questionText || options.length > 0)) {
          this.onQuestionDetected({
            questionText: questionText || '',
            options: options,
            hasQuizOptions: hasQuizOptions,
            category: activeCategory
          });
        }
      }
    }
  }

  window.MyBuddyDOMObserver = new DOMQuestionObserver();
})();
