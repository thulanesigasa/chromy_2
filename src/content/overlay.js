/**
 * Chromy 2 - Floating Overlay & Highlighting UI
 * Strict 60-30-10 Palette: Black (60%), Dark Charcoal (30%), Vibrant Orange & White (10%).
 * Clean minimal header without status badge tag. SVGs only, no emojis, no hover glow.
 */

(function () {
  if (window.MyBuddyOverlay) return;

  const SVG_ICONS = {
    shield: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
    document: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    target: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    checkWhite: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    minimize: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    maximize: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
  };

  class OverlayUI {
    constructor() {
      this.container = null;
      this.isMinimized = false;
      this.currentMatchData = null;
      this.onScanRequested = null;
      this.init();
    }

    init() {
      if (document.getElementById('my-buddy-overlay-root')) return;

      const root = document.createElement('div');
      root.id = 'my-buddy-overlay-root';
      document.body.appendChild(root);

      this.container = document.createElement('div');
      this.container.className = 'my-buddy-widget';
      this.container.innerHTML = `
        <div class="my-buddy-header" id="my-buddy-drag-handle">
          <div class="my-buddy-brand">
            <span class="my-buddy-icon">${SVG_ICONS.shield}</span>
            <span class="my-buddy-title">Chromy 2</span>
          </div>
          <div class="my-buddy-actions">
            <button class="mb-btn-icon" id="mb-btn-scan" title="Rescan Page">${SVG_ICONS.refresh}</button>
            <button class="mb-btn-icon" id="mb-btn-toggle" title="Minimize/Maximize">${SVG_ICONS.minimize}</button>
          </div>
        </div>

        <div class="my-buddy-body" id="my-buddy-body-content">
          <div class="mb-section mb-detected-question">
            <div class="mb-label">${SVG_ICONS.target} DETECTED QUESTION</div>
            <div class="mb-text" id="mb-q-text">Detecting active question on page...</div>
          </div>

          <div class="mb-section mb-matched-answer">
            <div class="mb-label-group">
              <span class="mb-label">${SVG_ICONS.check} MATCHED ANSWER</span>
              <span class="mb-confidence-badge" id="mb-confidence">0% Match</span>
            </div>
            <div class="mb-answer-box" id="mb-a-box">
              <div class="mb-answer-text" id="mb-a-text">Upload your exam .docx documents in the extension popup to get instant answers.</div>
            </div>
          </div>

          <div class="mb-footer">
            <div class="mb-meta" id="mb-doc-meta">${SVG_ICONS.document} No active document match</div>
            <button class="mb-btn-primary" id="mb-btn-highlight">
              ${SVG_ICONS.checkWhite} Highlight Option
            </button>
          </div>
        </div>
      `;

      root.appendChild(this.container);

      this.bindEvents();
      this.makeDraggable();
    }

    bindEvents() {
      const toggleBtn = this.container.querySelector('#mb-btn-toggle');
      const scanBtn = this.container.querySelector('#mb-btn-scan');
      const highlightBtn = this.container.querySelector('#mb-btn-highlight');
      const bodyContent = this.container.querySelector('#my-buddy-body-content');

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
          bodyContent.style.display = 'none';
          toggleBtn.innerHTML = SVG_ICONS.maximize;
          this.container.classList.add('minimized');
        } else {
          bodyContent.style.display = 'block';
          toggleBtn.innerHTML = SVG_ICONS.minimize;
          this.container.classList.remove('minimized');
        }
      });

      scanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onScanRequested) {
          this.onScanRequested();
        }
      });

      highlightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.highlightOptionOnPage();
      });
    }

    makeDraggable() {
      const handle = this.container.querySelector('#my-buddy-drag-handle');
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      handle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = this.container.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        this.container.style.left = `${initialLeft + dx}px`;
        this.container.style.top = `${initialTop + dy}px`;
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }

    updateDetectedQuestion(text) {
      const qText = this.container.querySelector('#mb-q-text');
      qText.textContent = text || 'Scanning page...';
    }

    updateMatchResult(result) {
      this.currentMatchData = result;

      const confidence = this.container.querySelector('#mb-confidence');
      const aText = this.container.querySelector('#mb-a-text');
      const docMeta = this.container.querySelector('#mb-doc-meta');
      const highlightBtn = this.container.querySelector('#mb-btn-highlight');

      if (result.matchFound) {
        confidence.textContent = `${result.score}% MATCH`;
        confidence.style.display = 'inline-block';

        aText.innerHTML = `<strong>Answer:</strong> ${this.escapeHtml(result.answer)}`;
        docMeta.innerHTML = `${SVG_ICONS.document} ${this.escapeHtml(result.sourceDoc)}`;

        highlightBtn.disabled = false;
        highlightBtn.style.opacity = '1';

        if (result.score >= 80) {
          this.highlightOptionOnPage();
        }
      } else {
        confidence.style.display = 'none';

        if (result.reason) {
          aText.textContent = `No stored answer found. Upload your .docx document in popup. (${result.reason})`;
        } else {
          aText.textContent = `No matching answer in knowledge base. (Best candidate score: ${result.score || 0}%)`;
        }

        docMeta.innerHTML = `${SVG_ICONS.document} No active document match`;
        highlightBtn.disabled = true;
        highlightBtn.style.opacity = '0.4';
      }
    }

    highlightOptionOnPage() {
      if (!this.currentMatchData || !this.currentMatchData.answer) return;

      const answerText = this.currentMatchData.answer.toLowerCase().trim();
      const options = Array.from(document.querySelectorAll('label, [role="radio"], [role="checkbox"], .subModuleContainer--D82xI, li, .nodeContainer--3DQo1'));

      options.forEach(el => {
        const text = (el.innerText || '').toLowerCase().trim();
        if (text && (text.includes(answerText) || answerText.includes(text))) {
          el.classList.add('my-buddy-highlighted-choice');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  }

  window.MyBuddyOverlay = new OverlayUI();
})();
