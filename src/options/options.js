/**
 * Chromy 2 - Extension Options Controller
 * Full-page document management hub with Word (.docx) parser, database inspector, and matcher tester.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const contentSections = document.querySelectorAll('.content-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      navItems.forEach(i => i.classList.remove('active'));
      contentSections.forEach(s => s.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(target).classList.add('active');

      if (target === 'section-database') {
        loadKnowledgeBaseData();
      }
    });
  });

  // Dropzone & File Ingestion
  const dropzone = document.getElementById('opt-dropzone');
  const fileInput = document.getElementById('opt-file-input');
  const categoryInput = document.getElementById('opt-category-input');
  const pasteInput = document.getElementById('opt-paste-input');
  const btnParseText = document.getElementById('opt-btn-parse-text');
  const feedbackBox = document.getElementById('opt-upload-feedback');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  btnParseText.addEventListener('click', () => {
    const rawText = pasteInput.value.trim();
    if (!rawText) {
      showFeedback('Please paste question & answer text to parse.', false);
      return;
    }

    const category = categoryInput.value.trim() || 'General';
    const entries = parseQAText(rawText);

    if (entries.length === 0) {
      showFeedback('Could not extract Q&A pairs from text. Format should be "Q: ... Answer: ..."', false);
      return;
    }

    saveDocumentEntries(`Pasted_Doc_${Date.now()}`, category, entries);
  });

  async function handleFileSelected(file) {
    const fileName = file.name;
    const category = categoryInput.value.trim() || 'General';
    showFeedback(`Parsing ${fileName}...`, true);

    try {
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        if (typeof mammoth === 'undefined') {
          showFeedback('Mammoth.js library missing for Word .docx parsing.', false);
          return;
        }
        const result = await mammoth.extractRawText({ arrayBuffer });
        const rawText = result.value || '';
        const entries = parseQAText(rawText);
        if (entries.length === 0) {
          showFeedback(`Parsed ${fileName} but found 0 structured Q&A pairs. Check document formatting.`, false);
        } else {
          saveDocumentEntries(fileName, category, entries);
        }
      } else if (fileName.endsWith('.json')) {
        const jsonText = await file.text();
        const data = JSON.parse(jsonText);
        const entries = Array.isArray(data) ? data : (data.questions || []);
        saveDocumentEntries(fileName, category, entries);
      } else {
        const rawText = await file.text();
        const entries = parseQAText(rawText);
        saveDocumentEntries(fileName, category, entries);
      }
    } catch (err) {
      showFeedback(`Error reading file: ${err.message}`, false);
    }
  }

  function parseQAText(rawText) {
    const entries = [];
    const blocks = rawText.split(/\n\s*\n+/);

    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return;

      let question = '';
      let answer = '';
      const options = [];

      lines.forEach(line => {
        if (/^(question|q\d*|q:|\d+[\.\)])/i.test(line)) {
          question = line.replace(/^(question\s*\d*:?|q\d*:?|\d+[\.\)]\s*)/i, '').trim();
        } else if (/^(answer|ans|correct answer|correct:?|ans:?)/i.test(line)) {
          answer = line.replace(/^(answer:?|ans:?|correct answer:?|correct:?)/i, '').trim();
        } else if (/^[a-d][\.\)]/i.test(line)) {
          options.push(line);
        } else {
          if (!question) {
            question = line;
          } else if (!answer) {
            answer += ' ' + line;
          }
        }
      });

      if (question && answer) {
        entries.push({ question: question.trim(), answer: answer.trim(), options });
      }
    });

    if (entries.length === 0) {
      const lines = rawText.split('\n');
      let currentQ = null;
      let currentA = null;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const qMatch = trimmed.match(/^(?:Q\d*:?|\d+[\.\)])\s*(.+)/i);
        const aMatch = trimmed.match(/^(?:Answer:?|Ans:?|Correct Answer:?)\s*(.+)/i);

        if (qMatch) {
          if (currentQ && currentA) {
            entries.push({ question: currentQ, answer: currentA, options: [] });
          }
          currentQ = qMatch[1].trim();
          currentA = null;
        } else if (aMatch && currentQ) {
          currentA = aMatch[1].trim();
          entries.push({ question: currentQ, answer: currentA, options: [] });
          currentQ = null;
          currentA = null;
        }
      });
    }

    return entries;
  }

  function saveDocumentEntries(docTitle, category, entries) {
    chrome.runtime.sendMessage(
      { action: 'save_document', docTitle, category, entries },
      (res) => {
        if (res && res.success) {
          showFeedback(`Saved ${res.count} Q&A entries from "${docTitle}" successfully!`, true);
          pasteInput.value = '';
          categoryInput.value = '';
          loadKnowledgeBaseData();
        } else {
          showFeedback('Failed to save document into extension storage.', false);
        }
      }
    );
  }

  function showFeedback(msg, isSuccess) {
    feedbackBox.textContent = msg;
    feedbackBox.className = `feedback-box ${isSuccess ? 'success' : 'error'}`;
  }

  // Database Management & Preview Section
  function loadKnowledgeBaseData() {
    chrome.runtime.sendMessage({ action: 'get_storage_summary' }, (res) => {
      if (!res) return;

      document.getElementById('opt-total-questions').textContent = res.totalQuestions || 0;
      document.getElementById('opt-total-docs').textContent = res.documents.length || 0;
      document.getElementById('nav-doc-count').textContent = res.documents.length || 0;

      const docTable = document.getElementById('opt-doc-table');
      if (!res.documents || res.documents.length === 0) {
        docTable.innerHTML = '<div class="empty-state">No documents stored in knowledge base yet.</div>';
      } else {
        docTable.innerHTML = res.documents.map(doc => `
          <div class="doc-row">
            <div>
              <div class="doc-title">${escapeHtml(doc.title)}</div>
              <div class="doc-meta">${doc.itemCount} Questions • Category: ${escapeHtml(doc.category)}</div>
            </div>
            <button class="btn-delete-row" data-doc="${escapeHtml(doc.title)}" title="Delete Document">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `).join('');

        docTable.querySelectorAll('.btn-delete-row').forEach(btn => {
          btn.addEventListener('click', () => {
            const docTitle = btn.getAttribute('data-doc');
            if (confirm(`Delete document "${docTitle}" from knowledge base?`)) {
              chrome.runtime.sendMessage({ action: 'delete_document', docTitle }, () => {
                loadKnowledgeBaseData();
              });
            }
          });
        });
      }

      // Load stored questions preview
      chrome.storage.local.get(['my_buddy_questions'], (data) => {
        const questions = data.my_buddy_questions || [];
        renderQAPreview(questions);

        // Bind live search filter
        const searchInput = document.getElementById('opt-search-preview');
        searchInput.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase().trim();
          const filtered = questions.filter(q =>
            q.question.toLowerCase().includes(query) ||
            q.answer.toLowerCase().includes(query) ||
            (q.category && q.category.toLowerCase().includes(query))
          );
          renderQAPreview(filtered);
        });
      });
    });
  }

  function renderQAPreview(entries) {
    const list = document.getElementById('opt-qa-preview-list');
    if (!entries || entries.length === 0) {
      list.innerHTML = '<div class="empty-state">No matching Q&A entries found.</div>';
      return;
    }

    list.innerHTML = entries.slice(0, 50).map(entry => `
      <div style="background:#0a0a0a; border:1px solid #27272a; padding:12px; border-radius:8px;">
        <div style="font-size:11px; color:#f97316; font-weight:700; margin-bottom:4px;">${escapeHtml(entry.category)} • ${escapeHtml(entry.sourceDoc)}</div>
        <div style="font-weight:600; color:#ffffff; font-size:13px; margin-bottom:6px;">Q: ${escapeHtml(entry.question)}</div>
        <div style="color:#ffffff; font-size:12px; font-weight:600; background:#18181b; padding:8px; border-radius:6px; border-left:3px solid #f97316;">Ans: ${escapeHtml(entry.answer)}</div>
      </div>
    `).join('');
  }

  // Backup & Clear actions
  document.getElementById('btn-export-backup').addEventListener('click', () => {
    chrome.storage.local.get(['my_buddy_questions', 'my_buddy_docs'], (result) => {
      const exportData = JSON.stringify(result, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chromy2_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  document.getElementById('btn-clear-database').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL stored exam documents and Q&A entries?')) {
      chrome.runtime.sendMessage({ action: 'clear_all_data' }, () => {
        loadKnowledgeBaseData();
      });
    }
  });

  // Test Matcher Section
  const testQueryInput = document.getElementById('opt-test-query');
  const btnTestMatch = document.getElementById('opt-btn-test-match');
  const testResultsBox = document.getElementById('opt-test-results');

  btnTestMatch.addEventListener('click', () => {
    const query = testQueryInput.value.trim();
    if (!query) return;

    testResultsBox.innerHTML = '<div class="empty-state">Searching knowledge base...</div>';

    chrome.runtime.sendMessage({ action: 'get_answer', question: query }, (res) => {
      if (!res) {
        testResultsBox.innerHTML = '<div class="empty-state">Error querying database matcher.</div>';
        return;
      }

      if (res.matchFound) {
        testResultsBox.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:#f97316; font-size:14px;">Score: ${res.score}% Match Confidence</strong>
            <span style="font-size:12px; color:#a1a1aa;">${escapeHtml(res.sourceDoc)}</span>
          </div>
          <div style="font-size:13px; color:#ffffff; margin-bottom:8px;"><strong>Matched Question:</strong> ${escapeHtml(res.matchedQuestion)}</div>
          <div style="font-size:13px; color:#ffffff; font-weight:700; background:#18181b; padding:12px; border-radius:8px; border-left:4px solid #f97316;"><strong>Stored Answer:</strong> ${escapeHtml(res.answer)}</div>
        `;
      } else {
        testResultsBox.innerHTML = `
          <div style="color:#ffffff; font-size:13px; font-weight:700;">No Match Found</div>
          <div style="font-size:12px; color:#a1a1aa; margin-top:4px;">Best candidate match score: ${res.score || 0}%</div>
        `;
      }
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initial load
  loadKnowledgeBaseData();
});
