/**
 * Chromy 2 - Bulletproof DOM Question & Option Extractor
 * Tuned for Cisco NetAcad, CyberOps Associate, SkillsForAll, and LMS quiz platforms.
 */

(function () {
  if (window.MyBuddyDOMObserver) return;

  class DOMQuestionObserver {
    constructor() {
      this.lastQuestionText = '';
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

    extractPageQuestionAndOptions() {
      let detectedQuestion = '';
      const detectedOptions = [];

      // 1. Query candidate text elements across DOM
      const allTextNodes = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, span, label, [class*="question"], [class*="Question"], [class*="prompt"]')
      ).filter(el => {
        if (el.closest('#my-buddy-overlay-root, #skiplinks, .skiplinks, .skipLinkList')) return false;

        const text = (el.innerText || '').trim();
        if (text.length < 6 || text.length > 800) return false;

        // Blacklist accessibility skiplinks and navigation buttons
        const textLower = text.toLowerCase();
        if (
          textLower.includes('select a space') ||
          textLower.includes('skip to') ||
          textLower.includes('skip question') ||
          textLower.includes('search course outline') ||
          textLower === 'skip all' ||
          textLower === 'submit'
        ) {
          return false;
        }

        if (el.closest('button, nav, footer, [role="navigation"]')) return false;

        return true;
      });

      // Priority 1: Elements ending with '?'
      const questionMarkElements = allTextNodes.filter(el => {
        const txt = (el.innerText || '').trim();
        return txt.endsWith('?') && !txt.toLowerCase().includes('select a space');
      });

      if (questionMarkElements.length > 0) {
        questionMarkElements.sort((a, b) => (a.innerText || '').trim().length - (b.innerText || '').trim().length);
        detectedQuestion = (questionMarkElements[0].innerText || '').trim();
      }

      // Priority 2: Elements starting with question words
      if (!detectedQuestion) {
        const questionWordElements = allTextNodes.filter(el => {
          const txt = (el.innerText || '').trim();
          return /^(which|what|why|how|when|where|who|select|choose|identify|match|true|false)\b/i.test(txt) &&
                 !txt.toLowerCase().includes('select a space');
        });

        if (questionWordElements.length > 0) {
          questionWordElements.sort((a, b) => (a.innerText || '').trim().length - (b.innerText || '').trim().length);
          detectedQuestion = (questionWordElements[0].innerText || '').trim();
        }
      }

      // Priority 3: Sibling of Question Number Heading
      if (!detectedQuestion) {
        const questionHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, [class*="Question"], [class*="question"]'))
          .filter(el => !el.closest('#my-buddy-overlay-root') && /^question\s*\d+/i.test((el.innerText || '').trim()));

        if (questionHeadings.length > 0) {
          const heading = questionHeadings[0];
          let sibling = heading.nextElementSibling;
          while (sibling) {
            const txt = (sibling.innerText || '').trim();
            if (txt.length > 5 && !txt.toLowerCase().includes('submit') && !txt.toLowerCase().includes('select a space')) {
              detectedQuestion = txt;
              break;
            }
            sibling = sibling.nextElementSibling;
          }
        }
      }

      // Extract option choices from page
      const optionElements = document.querySelectorAll('label, [role="radio"], [role="checkbox"], .option, .choice, li');
      optionElements.forEach(el => {
        if (!el.closest('#my-buddy-overlay-root')) {
          const txt = (el.innerText || '').trim();
          if (txt.length > 2 && txt.length < 300 && !detectedOptions.includes(txt)) {
            detectedOptions.push(txt);
          }
        }
      });

      return {
        questionText: detectedQuestion,
        options: detectedOptions
      };
    }

    scanPage(force = false) {
      const { questionText, options } = this.extractPageQuestionAndOptions();
      const activeCategory = this.detectActiveModuleCategory();

      if (force || questionText !== this.lastQuestionText || activeCategory !== this.lastCategoryText) {
        this.lastQuestionText = questionText;
        this.lastCategoryText = activeCategory;

        if (this.onQuestionDetected && (questionText || options.length > 0)) {
          this.onQuestionDetected({
            questionText: questionText || 'Question detected',
            options: options,
            category: activeCategory
          });
        }
      }
    }
  }

  window.MyBuddyDOMObserver = new DOMQuestionObserver();
})();
