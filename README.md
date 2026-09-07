# Chromy 2 - Smart Exam & Quiz Assistant Chrome Extension

**Chromy 2** is a Manifest V3 Chrome Extension designed to assist students and test takers taking online checkpoint exams, quizzes, and modules (such as Cisco Networking Academy NetAcad, CyberOps Associate, Skills For All, and similar learning management systems).

`Chromy 2` allows you to upload Word documents (`.docx`), `.json`, `.txt` files, or raw Q&A text for all your checkpoint exams into local extension storage. When you navigate to an exam or quiz webpage, the extension automatically detects the active exam module and currently displayed questions, searches your uploaded documents using a high-precision fuzzy matching algorithm, displays the relevant answer on a sleek floating UI, and visually highlights matching answer choices directly on the webpage!

---

## 🌟 Key Features

- 📄 **Client-Side Word (.docx) & Document Ingestion**: Upload Word documents (`.docx`), JSON databases, text files, or paste raw Q&A text directly into the extension popup. Extracted content is parsed completely in browser using `mammoth.js` without sending any data to external servers.
- 🎯 **Automatic DOM Question Detection**: Real-time `MutationObserver` detects dynamic page rendering, active module headings (e.g. Cisco CyberOps Associate Checkpoint Exams), question text, and option elements.
- 🔍 **High-Precision Fuzzy Matching Engine**: Utilizes string normalization, token overlap similarity (Jaccard Index), and Levenshtein distance to match webpage questions against stored exam answer documents with confidence scoring.
- 🖥️ **Sleek Draggable Overlay UI (60-30-10 Rule)**: Non-intrusive floating overlay observing the 60-30-10 color rule (60% `#0f172a` Slate background, 30% `#1e293b`/`#334155` containers, 10% `#10b981` Emerald accent) with clean SVG vector icons from svgrepo.com.
- 💡 **Option Highlighting**: Automatically highlights the correct multiple-choice option radio button / checkbox directly on the exam page.
- 📦 **Local & Privacy First**: All uploaded exam files and database entries remain stored locally in `chrome.storage.local`.

---

## 🏗️ Project Architecture

```
chromy_2/
├── manifest.json                  # Manifest V3 extension configuration
├── .gitignore                     # Git ignored patterns
├── README.md                      # Complete project documentation and structure
├── assets/
│   ├── .gitkeep                   # Asset folder placeholder
│   ├── icons/                     # Extension icons (16px, 48px, 128px)
│   │   ├── .gitkeep
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── lib/                       # Third-party client-side libraries
│       └── mammoth.min.js         # Browser build of Mammoth.js for Word docx parsing
├── src/
│   ├── background/
│   │   ├── service_worker.js      # Chrome extension service worker & storage controller
│   │   └── matcher.js             # Fuzzy matching algorithm & query engine
│   ├── content/
│   │   ├── content_script.js      # Main webpage scanner & DOM analyzer
│   │   ├── dom_observer.js        # Dynamic DOM change observer
│   │   ├── overlay.js             # On-page floating draggable UI widget
│   │   └── overlay.css            # Floating widget & option highlighting styles
│   ├── popup/
│   │   ├── popup.html             # Extension popup document manager UI
│   │   ├── popup.css              # Popup styling adhering to 60-30-10 rule
│   │   └── popup.js               # Popup controller & document parser
│   └── options/
│       └── .gitkeep
```

---

## 🚀 Installation & Setup

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the extension directory.
4. Pin **Chromy 2** to your extension toolbar.

---

## 📖 How to Use

1. Click the **Chromy 2** extension icon to open the Popup window.
2. Click **Upload Document** and select your Word (`.docx`), `.json`, or `.txt` exam answer document.
3. Assign a Category or Exam Module Name (e.g., `Module 1: Threat Actors`, `Checkpoint Exam`).
4. Navigate to your Cisco NetAcad or online exam page.
5. `Chromy 2` will automatically detect the question on screen, retrieve the matching answer from your uploaded document, and show it in the floating on-screen overlay!

---

## 🎨 Design System Specifications

- **Dominant Color (60%)**: `#0f172a` (Slate Dark Canvas)
- **Secondary Container (30%)**: `#1e293b` & `#334155` (Cards, Headers, Input fields)
- **Accent Color (10%)**: `#10b981` (Emerald Green Highlights) & `#3b82f6` (Electric Blue Badges)
- **Icons**: 100% Inline SVGs (No icon fonts, no emojis)
- **Interactions**: Smooth scale & border highlights (No hover glow effects)

---

## 📄 License
MIT License
