// ⚠️ Your Google Apps Script Web App Endpoint URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5hiXfzqpU95W9H2KAl5ywmfFixDxvWtRb30D6cbAv7tSF_SPslTEkEJt2BnaRgdwbpA/exec";

/**
 * Universal helper function to call Google Apps Script.
 * Using 'text/plain;charset=utf-8' prevents CORS preflight (OPTIONS) requests.
 */
async function callBackend(action, payload = {}) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // Bypasses CORS Preflight
      },
      body: JSON.stringify({ action: action, ...payload })
    });

    const result = await response.json();
    if (result.status === "error") throw new Error(result.message);
    return result.data;
  } catch (err) {
    console.error("Backend Error:", err);
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
  
  const formattedText = escapeHtml(text || '')
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
  console.error("Search error:", error);
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
      <h3 style="font-size: 16px; margin-bottom: 12px; color: #fff;">📄 Attachment Documents</h3>
    `;

    article.pdfs.forEach(function(pdf, index) {
      pdfSection += `
        <a href="${pdf.url}" target="_blank" class="pdf-card">
          <div class="pdf-icon">📄</div>
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

/* =========================================================
   4. BACKGROUND ANIMATION CANVAS
========================================================= */
function startAiCanvas() {
    const canvas = document.getElementById("aiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width, height;
    let particles = [];
    let matrixDust = [];
    let pulses = [];
    let shockwaves = [];
    let mouse = { x: null, y: null, radius: 220 };

    function resize() {
        width = canvas.width = window.innerWidth || document.documentElement.clientWidth;
        height = canvas.height = window.innerHeight || document.documentElement.clientHeight;
        createParticles();
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener("mouseleave", () => {
        mouse.x = null;
        mouse.y = null;
    });

    window.addEventListener("click", (e) => {
        shockwaves.push(new Shockwave(e.clientX, e.clientY));
    });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 1.2;
            this.vy = (Math.random() - 0.5) * 1.2;
            this.radius = Math.random() * 2.8 + 1.8;
            this.color = Math.random() > 0.4 ? "#00f0ff" : (Math.random() > 0.5 ? "#3b82f6" : "#a855f7");
            this.baseAlpha = Math.random() * 0.5 + 0.5;
            this.alpha = this.baseAlpha;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            this.alpha = this.baseAlpha + Math.sin(Date.now() * 0.003 + this.x) * 0.25;

            if (mouse.x !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.x -= (dx / dist) * force * 3;
                    this.y -= (dy / dist) * force * 3;
                }
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class Dust {
        constructor() {
            this.reset();
            this.y = Math.random() * height;
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + 10;
            this.vy = -(Math.random() * 1.2 + 0.4);
            this.size = Math.random() * 2 + 0.8;
            this.alpha = Math.random() * 0.7 + 0.3;
            this.color = Math.random() > 0.5 ? "#00f0ff" : "#c084fc";
        }

        update() {
            this.y += this.vy;
            if (this.y < -10) this.reset();
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class Pulse {
        constructor(p1, p2) {
            this.p1 = p1;
            this.p2 = p2;
            this.progress = 0;
            this.speed = Math.random() * 0.03 + 0.015;
            this.color = Math.random() > 0.5 ? "#ffffff" : "#00f0ff";
        }

        update() {
            this.progress += this.speed;
        }

        draw() {
            if (this.progress > 1) return;
            const x = this.p1.x + (this.p2.x - this.p1.x) * this.progress;
            const y = this.p1.y + (this.p2.y - this.p1.y) * this.progress;

            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 18;
            ctx.globalAlpha = 1;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class Shockwave {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 5;
            this.maxRadius = 180;
            this.alpha = 0.9;
            this.speed = 5;
        }

        update() {
            this.radius += this.speed;
            this.alpha -= 0.025;
        }

        draw() {
            if (this.alpha <= 0) return;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 20;
            ctx.globalAlpha = Math.max(0, this.alpha);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    function createParticles() {
        particles = [];
        matrixDust = [];
        const count = Math.floor((width * height) / 11000);
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
        for (let i = 0; i < 50; i++) {
            matrixDust.push(new Dust());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < matrixDust.length; i++) {
            matrixDust[i].update();
            matrixDust[i].draw();
        }

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    const alpha = (1 - dist / 150) * 0.45;
                    ctx.strokeStyle = "#00f0ff";
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    if (Math.random() < 0.0006) {
                        pulses.push(new Pulse(particles[i], particles[j]));
                    }
                }
            }
        }

        for (let i = pulses.length - 1; i >= 0; i--) {
            pulses[i].update();
            pulses[i].draw();
            if (pulses[i].progress >= 1) {
                pulses.splice(i, 1);
            }
        }

        for (let i = shockwaves.length - 1; i >= 0; i--) {
            shockwaves[i].update();
            shockwaves[i].draw();
            if (shockwaves[i].alpha <= 0) {
                shockwaves.splice(i, 1);
            }
        }

        requestAnimationFrame(animate);
    }

    resize();
    animate();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    startAiCanvas();
} else {
    document.addEventListener("DOMContentLoaded", startAiCanvas);
}
window.addEventListener("load", startAiCanvas);
