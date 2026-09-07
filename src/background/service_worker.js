/**
 * My Buddy - Service Worker Background Script
 * Listens for content script messages, manages local storage database, and runs matching engine.
 */

importScripts('matcher.js');

// Default initial state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['my_buddy_questions', 'my_buddy_docs'], (result) => {
    if (!result.my_buddy_questions) {
      chrome.storage.local.set({
        my_buddy_questions: [],
        my_buddy_docs: []
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_answer') {
    chrome.storage.local.get(['my_buddy_questions'], (result) => {
      const kbEntries = result.my_buddy_questions || [];
      const matchResult = findBestMatch(
        request.question,
        kbEntries,
        request.category || null
      );
      sendResponse(matchResult);
    });
    return true; // Keep response channel open for async response
  }

  if (request.action === 'save_document') {
    const { docTitle, category, entries } = request;

    chrome.storage.local.get(['my_buddy_questions', 'my_buddy_docs'], (result) => {
      let currentQuestions = result.my_buddy_questions || [];
      let currentDocs = result.my_buddy_docs || [];

      // Remove existing doc if updating
      currentQuestions = currentQuestions.filter(q => q.sourceDoc !== docTitle);
      currentDocs = currentDocs.filter(d => d.title !== docTitle);

      // Append new entries with IDs
      const formattedEntries = entries.map((e, idx) => ({
        id: `${docTitle}_${Date.now()}_${idx}`,
        question: e.question,
        answer: e.answer,
        options: e.options || [],
        category: category || 'General',
        sourceDoc: docTitle
      }));

      currentQuestions.push(...formattedEntries);
      currentDocs.push({
        title: docTitle,
        category: category || 'General',
        itemCount: formattedEntries.length,
        uploadedAt: new Date().toISOString()
      });

      chrome.storage.local.set({
        my_buddy_questions: currentQuestions,
        my_buddy_docs: currentDocs
      }, () => {
        sendResponse({ success: true, count: formattedEntries.length });
      });
    });
    return true;
  }

  if (request.action === 'get_storage_summary') {
    chrome.storage.local.get(['my_buddy_questions', 'my_buddy_docs'], (result) => {
      sendResponse({
        totalQuestions: (result.my_buddy_questions || []).length,
        documents: result.my_buddy_docs || []
      });
    });
    return true;
  }

  if (request.action === 'delete_document') {
    const { docTitle } = request;
    chrome.storage.local.get(['my_buddy_questions', 'my_buddy_docs'], (result) => {
      const currentQuestions = (result.my_buddy_questions || []).filter(q => q.sourceDoc !== docTitle);
      const currentDocs = (result.my_buddy_docs || []).filter(d => d.title !== docTitle);

      chrome.storage.local.set({
        my_buddy_questions: currentQuestions,
        my_buddy_docs: currentDocs
      }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'clear_all_data') {
    chrome.storage.local.set({
      my_buddy_questions: [],
      my_buddy_docs: []
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
