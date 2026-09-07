/**
 * My Buddy - Extension Popup Controller
 * Manages document uploads (.docx parsing via Mammoth.js), database UI, manual search tests, and backups.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');

      if (targetTab === 'manage-tab') {
        loadStorageSummary();
      }
    });
  });

  const btnOpenOptions = document.getElementById('btn-open-options');
  if (btnOpenOptions) {
    btnOpenOptions.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Dropzone & File Input setup
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const categoryInput = document.getElementById('category-input');
  const pasteTextInput = document.getElementById('paste-text-input');
  const btnProcessText = document.getElementById('btn-process-text');
  const uploadFeedback = document.getElementById('upload-feedback');

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

  btnProcessText.addEventListener('click', () => {
    const rawText = pasteTextInput.value.trim();
    if (!rawText) {
      showFeedback('Please paste Q&A text to process.', false);
      return;
    }

    const category = categoryInput.value.trim() || 'General';
    const entries = parseQAText(rawText);

    if (entries.length === 0) {
      showFeedback('Could not extract any Q&A pairs from text. Format should be "Q: ... Answer: ..."', false);
      return;
    }

    saveDocumentEntries(`Pasted_Text_${Date.now()}`, category, entries);
  });

  async function handleFileSelected(file) {
    const fileName = file.name;
    const category = categoryInput.value.trim() || 'General';
    showFeedback(`Parsing ${fileName}...`, true);

    try {
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        if (typeof mammoth === 'undefined') {
          showFeedback('Mammoth.js library missing for .docx parsing.', false);
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
    // Split text into blocks by empty lines or question headers
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
        entries.push({
          question: question.trim(),
          answer: answer.trim(),
          options
        });
      }
    });

    // Secondary line-by-line fallback regex parser if block splitting didn't catch enough entries
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
      {
        action: 'save_document',
        docTitle,
        category,
        entries
      },
      (res) => {
        if (res && res.success) {
          showFeedback(`Successfully saved ${res.count} Q&A entries from "${docTitle}"!`, true);
          pasteTextInput.value = '';
          categoryInput.value = '';
          loadStorageSummary();
        } else {
          showFeedback('Failed to save document into extension storage.', false);
        }
      }
    );
  }

  function showFeedback(msg, isSuccess) {
    uploadFeedback.textContent = msg;
    uploadFeedback.className = `feedback-msg ${isSuccess ? 'success' : 'error'}`;
    uploadFeedback.style.display = 'block';
  }

  // Database Management Tab
  function loadStorageSummary() {
    chrome.runtime.sendMessage({ action: 'get_storage_summary' }, (res) => {
      if (!res) return;

      document.getElementById('stat-total-q').textContent = res.totalQuestions || 0;
      document.getElementById('stat-total-docs').textContent = res.documents.length || 0;
      document.getElementById('tab-doc-count').textContent = res.documents.length || 0;

      const docList = document.getElementById('doc-list');
      if (!res.documents || res.documents.length === 0) {
        docList.innerHTML = '<div class="empty-state">No documents uploaded yet. Upload a Word file to begin.</div>';
        return;
      }

      docList.innerHTML = res.documents.map(doc => `
        <div class="doc-card">
          <div class="doc-info">
            <span class="doc-title">${escapeHtml(doc.title)}</span>
            <span class="doc-meta">${doc.itemCount} Questions • ${escapeHtml(doc.category)}</span>
          </div>
          <button class="doc-delete-btn" data-doc="${escapeHtml(doc.title)}" title="Delete Document">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `).join('');

      docList.querySelectorAll('.doc-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const docTitle = btn.getAttribute('data-doc');
          if (confirm(`Delete document "${docTitle}"?`)) {
            chrome.runtime.sendMessage({ action: 'delete_document', docTitle }, () => {
              loadStorageSummary();
            });
          }
        });
      });
    });
  }

  document.getElementById('btn-export-json').addEventListener('click', () => {
    chrome.storage.local.get(['my_buddy_questions', 'my_buddy_docs'], (result) => {
      const exportData = JSON.stringify(result, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_buddy_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear ALL uploaded documents and Q&A entries?')) {
      chrome.runtime.sendMessage({ action: 'clear_all_data' }, () => {
        loadStorageSummary();
      });
    }
  });

  // Test Match Tab
  const testQInput = document.getElementById('test-q-input');
  const btnRunTest = document.getElementById('btn-run-test');
  const testResultBox = document.getElementById('test-result-box');

  btnRunTest.addEventListener('click', () => {
    const qText = testQInput.value.trim();
    if (!qText) return;

    testResultBox.innerHTML = '<div class="result-placeholder">Searching matcher...</div>';

    chrome.runtime.sendMessage({ action: 'get_answer', question: qText }, (res) => {
      if (!res) {
        testResultBox.innerHTML = '<div class="result-placeholder">Error searching database.</div>';
        return;
      }

      if (res.matchFound) {
        testResultBox.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:#10b981; font-size:12px;">Score: ${res.score}% Match</strong>
            <span style="font-size:10px; color:#94a3b8;">${escapeHtml(res.sourceDoc)}</span>
          </div>
          <div style="font-size:11px; color:#cbd5e1; margin-bottom:6px;"><strong>Matched:</strong> ${escapeHtml(res.matchedQuestion)}</div>
          <div style="font-size:12px; color:#f8fafc; font-weight:600; background:#0f172a; padding:8px; border-radius:6px; border:1px solid #334155;"><strong>Answer:</strong> ${escapeHtml(res.answer)}</div>
        `;
      } else {
        testResultBox.innerHTML = `
          <div style="color:#ef4444; font-size:12px; font-weight:600;">No Match Found</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Best candidate confidence: ${res.score || 0}%</div>
        `;
      }
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initial load
  loadStorageSummary();
});
