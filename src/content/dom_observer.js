/**
 * My Buddy - Webpage Question & Module Extractor Observer
 * Intelligent DOM scanner tuned for Cisco NetAcad, CyberOps, SkillsForAll, and generic quiz LMS sites.
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
    }

    stop() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }

    detectActiveModuleCategory() {
      // 1. Look for Cisco NetAcad / CyberOps active module nodes
      const activeModuleNode = document.querySelector('.nodeContainer--3DQo1.nodeSubSectionActive--EJiXb .nodeName--AZrtx, .outlineContainer--m04EY .active .nodeName--AZrtx, .courseTitle--zMkHL');
      if (activeModuleNode && activeModuleNode.innerText) {
        return activeModuleNode.innerText.trim();
      }

      // 2. Look for active tab or exam headings
      const headingNode = document.querySelector('h1, h2, .active--KiHs6, [aria-selected="true"]');
      if (headingNode && headingNode.innerText) {
        return headingNode.innerText.trim();
      }

      return 'General';
    }

    findQuestionElements() {
      const candidates = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, li')).filter(el => {
        // Ignore elements inside My Buddy UI widget
        if (el.closest('#my-buddy-overlay-root')) return false;

        const text = (el.innerText || '').trim();
        if (text.length < 8 || text.length > 600) return false;

        const textLower = text.toLowerCase();

        // Filter out navigation/menu buttons and breadcrumbs
        const navBlacklist = ['next', 'previous', 'submit', 'quit', 'exit', 'menu', 'nav', 'navigation', 'back', 'skip', 'continue', 'skip question', 'search course outline'];
        if (navBlacklist.includes(textLower)) return false;

        if (el.closest('button, a, nav, footer, [role="button"], [role="tab"], [role="navigation"]')) {
          return false;
        }

        // Fast track: Check if text resembles a question
        const isQuestionPattern = text.endsWith('?') || /^(which|what|why|how|when|where|who|select|choose|identify|match|true|false)\b/i.test(text);

        if (!isQuestionPattern) {
          // Exclude input options
          if (el.closest('input, label, [role="radio"], [role="checkbox"], [role="option"]')) {
            return false;
          }
        }

        return true;
      });

      // Filter out containers that enclose smaller question candidates
      return candidates.filter(el => {
        return !candidates.some(other => el !== other && el.contains(other));
      });
    }

    scanPage(force = false) {
      const candidates = this.findQuestionElements();
      let bestMatchText = '';

      if (candidates.length > 0) {
        // 1. Highest priority: ends with '?'
        let bestEl = candidates.find(c => (c.innerText || '').trim().endsWith('?'));

        // 2. Second priority: starts with question keywords
        if (!bestEl) {
          bestEl = candidates.find(c =>
            /^(which|what|why|how|when|where|who|select|choose|identify|match|true|false)\b/i.test((c.innerText || '').trim())
          );
        }

        // 3. Fallback: contains question mark
        if (!bestEl) {
          bestEl = candidates.find(c => (c.innerText || '').includes('?'));
        }

        if (bestEl) {
          bestMatchText = (bestEl.innerText || '').trim();
        }
      }

      const activeCategory = this.detectActiveModuleCategory();

      if (force || bestMatchText !== this.lastQuestionText || activeCategory !== this.lastCategoryText) {
        this.lastQuestionText = bestMatchText;
        this.lastCategoryText = activeCategory;

        if (this.onQuestionDetected && bestMatchText) {
          this.onQuestionDetected({
            questionText: bestMatchText,
            category: activeCategory
          });
        }
      }
    }
  }

  window.MyBuddyDOMObserver = new DOMQuestionObserver();
})();
