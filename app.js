// ?? REPLACE WITH YOUR ACTUAL GOOGLE APPS SCRIPT WEB APP URL (must end in /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5hiXfzqpU95W9H2KAl5ywmfFixDxvWtRb30D6cbAv7tSF_SPslTEkEJt2BnaRgdwbpA/exec";

/**
 * Universal helper function to call Google Apps Script from Netlify.
 * Using 'text/plain;charset=utf-8' prevents CORS preflight (OPTIONS) requests.
 */
async function callBackend(action, payload = {}) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ action: action, ...payload })
    });

    const result = await response.json();
    if (result.status === "error") throw new Error(result.message);
    return result.data;
  } catch (err) {
    console.error("Backend API Error (" + action + "):", err);
    throw err;
  }
}

/* =========================================================
   1. CHATBOT HANDLERS
========================================================= */
function toggleKbChat() {
  const chatWindow = document.getElementById('ai-chat-window');
  const openIcon = document.getElementById('chat-icon-open');
  const closeIcon = document.getElementById('chat-icon-close');
  const isHidden = chatWindow.classList.contains('hidden');

  if (isHidden) {
    chatWindow.classList.remove('hidden');
    chatWindow.classList.add('flex');
    openIcon.classList.add('hidden');
    closeIcon.classList.remove('hidden');
    document.getElementById('chat-user-input').focus();
  } else {
    chatWindow.classList.add('hidden');
    chatWindow.classList.remove('flex');
    openIcon.classList.remove('hidden');
    closeIcon.classList.add('hidden');
  }
}

async function handleKbChatSubmit(e) {
  e.preventDefault();
  const inputEl = document.getElementById('chat-user-input');
  const question = inputEl.value.trim();

  if (!question) return;

  appendChatMessage('user', question);
  inputEl.value = '';
  setChatLoading(true);
  const loadingId = appendTypingIndicator();

  try {
    // Calls the 'askAI' action on Apps Script backend
    const aiAnswer = await callBackend("askAI", { userQuestion: question });
    removeTypingIndicator(loadingId);
    appendChatMessage('bot', aiAnswer);
  } catch (error) {
    removeTypingIndicator(loadingId);
    appendChatMessage('bot', 'Error contacting AI server: ' + error.message);
  } finally {
    setChatLoading(false);
  }
}

function appendChatMessage(sender, text) {
  const container = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  
  const formattedText = escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  if (sender === 'user') {
    msgDiv.className = 'flex items-start justify-end gap-2.5';
    msgDiv.innerHTML = `
      <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] leading-relaxed">
        ${formattedText}
      </div>
    `;
  } else {
    msgDiv.className = 'flex items-start gap-2.5';
    msgDiv.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs mt-0.5">
        <i class="fas fa-robot"></i>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm text-slate-800 dark:text-slate-100 max-w-[85%] leading-relaxed">
        ${formattedText}
      </div>
    `;
  }

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const id = 'typing-' + Date.now();
  const typingDiv = document.createElement('div');
  typingDiv.id = id;
  typingDiv.className = 'flex items-start gap-2.5';
  typingDiv.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs">
      <i class="fas fa-robot"></i>
    </div>
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-slate-400 flex items-center gap-1.5">
      <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
      <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
      <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
    </div>
  `;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function setChatLoading(isLoading) {
  const input = document.getElementById('chat-user-input');
  const button = document.getElementById('chat-send-btn');
  if (input) input.disabled = isLoading;
  if (button) button.disabled = isLoading;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* =========================================================
   2. SEARCH KNOWLEDGE BASE HANDLERS
========================================================= */
const searchBox = document.getElementById("search");

if (searchBox) {
  searchBox.addEventListener("keyup", async function () {
    let keyword = searchBox.value.trim();

    if (keyword === "") {
      document.getElementById("results").innerHTML = "";
      return;
    }

    document.getElementById("results").innerHTML = `
      <div class="loading">Searching AI knowledge neural network...</div>
    `;

    try {
      const results = await callBackend("search", { keyword: keyword });
      renderResults(results);
    } catch (err) {
      handleSearchError(err);
    }
  });
}

function renderResults(results) {
  let html = "";

  if (!results || results.length === 0) {
    html = `
      <div class="no-results">
        No matching articles found in Haven Knowledge Base.
      </div>
    `;
  } else {
    results.forEach(function (article) {
      html += `
        <div class="article-card" onclick="showArticle(${article.id})">
          <div class="article-card-badge">
            ${article.articleId || 'KB-ARTICLE'}
          </div>
          <h3>${article.topic}</h3>
          <p>${article.content || article.snippet || ''}</p>
        </div>
      `;
    });
  }

  document.getElementById("results").innerHTML = html;
}

function handleSearchError(error) {
  document.getElementById("results").innerHTML = `
    <div class="no-results">
      Error retrieving knowledge results. Please try again.
    </div>
  `;
}

/* =========================================================
   3. ARTICLE MODAL HANDLERS
========================================================= */
async function showArticle(id) {
  try {
    const article = await callBackend("getArticle", { id: id });
    displayModalArticle(article);
  } catch (err) {
    console.error("Failed to load article details:", err);
  }
}

function displayModalArticle(article) {
  if (!article) return;

  document.getElementById("modalTitle").innerText = article.topic;

  let pdfSection = "";

  if (article.pdfs && article.pdfs.length > 0) {
    pdfSection = `
      <hr>
      <h3 style="font-size: 16px; margin-bottom: 12px; color: #fff;">?? Attachment Documents</h3>
    `;

    article.pdfs.forEach(function(pdf, index) {
      pdfSection += `
        <a href="${pdf.url}" target="_blank" class="pdf-card">
          <div class="pdf-icon">??</div>
          <div class="pdf-info">
            <strong>${pdf.title || 'PDF Document ' + (index + 1)}</strong>
            <small>Click to open document in new tab</small>
          </div>
        </a>
      `;
    });
  }

  document.getElementById("modalContent").innerHTML = `
    <div style="margin-bottom: 12px;">
      <span class="article-card-badge">${article.articleId || 'KB-ARTICLE'}</span>
      <span style="font-size: 13px; color: var(--text-muted); margin-left: 10px;">
        Last Updated: ${article.updated || "N/A"}
      </span>
    </div>

    <div style="white-space: pre-wrap; line-height: 1.8;">
      ${article.content}
    </div>

    ${pdfSection}
  `;

  document.getElementById("articleModal").style.display = "block";
}

function closeArticle() {
  document.getElementById("articleModal").style.display = "none";
}

window.onclick = function(event) {
  const modal = document.getElementById("articleModal");
  if (event.target === modal) {
    closeArticle();
  }
};
