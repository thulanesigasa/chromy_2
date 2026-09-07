/**
 * Chromy 2 - High-Precision DOM Question & Option Extractor
 * Tuned for Cisco NetAcad, CyberOps Associate, SkillsForAll, and LMS quiz frames.
 * Blacklists cookie/privacy notices and prioritizes text near option choices.
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
        'skip all'
      ];

      return blacklistTerms.some(term => textLower.includes(term));
    }

    extractPageQuestionAndOptions() {
      let detectedQuestion = '';
      const detectedOptions = [];

      // 1. Extract all option choices on current page/frame
      const optionElements = document.querySelectorAll('label, [role="radio"], [role="checkbox"], .option, .choice, li');
      optionElements.forEach(el => {
        if (!el.closest('#my-buddy-overlay-root')) {
          const txt = (el.innerText || '').trim();
          if (txt.length > 2 && txt.length < 300 && !this.isCookieOrPrivacyText(txt) && !detectedOptions.includes(txt)) {
            detectedOptions.push(txt);
          }
        }
      });

      // 2. High-Priority Strategy: Find question prompt near option choices / radio inputs
      if (detectedOptions.length > 0) {
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

      // 3. Fallback Priority: Scan all text nodes for questions if prompt wasn't found near options
      if (!detectedQuestion) {
        const allTextNodes = Array.from(
          document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, span, [class*="question"], [class*="Question"], [class*="prompt"]')
        ).filter(el => {
          if (el.closest('#my-buddy-overlay-root, #skiplinks, .skiplinks, .skipLinkList')) return false;

          const text = (el.innerText || '').trim();
          if (text.length < 6 || text.length > 600) return false;
          if (this.isCookieOrPrivacyText(text)) return false;
          if (el.closest('button, nav, footer, [role="navigation"]')) return false;

          return true;
        });

        const questionMarkElements = allTextNodes.filter(el => (el.innerText || '').trim().endsWith('?'));
        if (questionMarkElements.length > 0) {
          questionMarkElements.sort((a, b) => (a.innerText || '').trim().length - (b.innerText || '').trim().length);
          detectedQuestion = (questionMarkElements[0].innerText || '').trim();
        }

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

      if (force || questionText !== this.lastQuestionText || activeCategory !== this.lastCategoryText) {
        this.lastQuestionText = questionText;
        this.lastCategoryText = activeCategory;

        if (this.onQuestionDetected && (questionText || options.length > 0)) {
          this.onQuestionDetected({
            questionText: questionText || 'Question detected',
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
