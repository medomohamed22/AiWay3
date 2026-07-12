const $ = selector => document.querySelector(selector);
const chat = $("#chat");
const promptEl = $("#prompt");
const sendBtn = $("#sendBtn");
const preview = $("#preview");
const modelSelect = $("#modelSelect");
const jumpBottom = $("#jumpBottom");

const STORE = "aiway_chats_v3";
const MEMORY = "aiway_memory";
const THEME = "aiway_theme";
const MODEL = "aiway_model";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 6;
const ALLOWED = new Set(["image/jpeg","image/png","image/webp","image/gif","application/pdf","text/plain","text/csv"]);

let activeId = null;
let pending = [];
let generating = false;
let controller = null;
let userPinnedToBottom = true;

const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const chats = () => { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; } };
const save = value => localStorage.setItem(STORE, JSON.stringify(value));
const esc = (s = "") => String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

function selectedModelLabel() {
  return modelSelect.options[modelSelect.selectedIndex]?.dataset.label || modelSelect.options[modelSelect.selectedIndex]?.textContent || "النموذج المختار";
}
function toast(text) {
  const node = $("#toast");
  node.textContent = text;
  node.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.style.display = "none", 2200);
}
function md(source = "") {
  const blocks = [];
  let s = source.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const key = `@@CODE${blocks.length}@@`;
    blocks.push(`<div class="code"><div class="code-head"><span>${esc(lang || "code")}</span><button class="copyCode">نسخ</button></div><pre><code>${esc(code.trim())}</code></pre></div>`);
    return key;
  });
  let output = esc(s)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`\n]+)`/g, '<code class="inline">$1</code>');
  let html = "", list = "";
  for (const line of output.split("\n")) {
    let match = line.match(/^\s*[-*] (.+)$/);
    if (match) { if (list !== "ul") { if (list) html += `</${list}>`; html += "<ul>"; list = "ul"; } html += `<li>${match[1]}</li>`; continue; }
    match = line.match(/^\s*\d+\. (.+)$/);
    if (match) { if (list !== "ol") { if (list) html += `</${list}>`; html += "<ol>"; list = "ol"; } html += `<li>${match[1]}</li>`; continue; }
    if (list) { html += `</${list}>`; list = ""; }
    if (!line.trim()) continue;
    html += /^<h/.test(line) ? line : `<p>${line}</p>`;
  }
  if (list) html += `</${list}>`;
  blocks.forEach((block, index) => html = html.replace(`@@CODE${index}@@`, block));
  return html;
}
function getActive() { return chats().find(item => item.id === activeId); }
function ensureChat() {
  if (getActive()) return;
  const all = chats();
  const item = { id: uid(), title: "محادثة جديدة", time: Date.now(), messages: [] };
  all.push(item); save(all); activeId = item.id;
}
function mutate(fn) {
  const all = chats();
  const index = all.findIndex(item => item.id === activeId);
  if (index < 0) return;
  fn(all[index]); all[index].time = Date.now(); save(all); renderHistory();
}
function format(time) {
  return new Intl.DateTimeFormat("ar-EG", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(time));
}
function isNearBottom() { return chat.scrollHeight - chat.scrollTop - chat.clientHeight < 90; }
function scrollToBottom(smooth = true) { chat.scrollTo({ top: chat.scrollHeight, behavior: smooth ? "smooth" : "auto" }); }
function updateJumpButton() {
  userPinnedToBottom = isNearBottom();
  jumpBottom.classList.toggle("show", !userPinnedToBottom && chat.scrollHeight > chat.clientHeight + 120);
}
function welcome() {
  chat.innerHTML = `<div class="welcome"><div class="welcome-inner"><div class="orb">✦</div><h1>أهلًا بك</h1><p>اختر ChatGPT أو Claude أو Gemini وابدأ المحادثة.</p><div class="quick"><button data-q="لخّص لي هذا الموضوع: ">تلخيص</button><button data-q="اكتب لي كود احترافي لـ ">برمجة</button><button data-q="اشرح لي ببساطة: ">شرح مبسط</button></div></div></div>`;
  chat.querySelectorAll("[data-q]").forEach(button => button.onclick = () => { promptEl.value = button.dataset.q; promptEl.focus(); });
  updateJumpButton();
}
function renderMessage(message, streaming = false) {
  const article = document.createElement("article");
  article.className = `message ${message.role === "user" ? "user" : "assistant"}`;
  const attachments = (message.files || []).map(file => file.type.startsWith("image/") ? `<img src="${file.data}" alt="${esc(file.name)}">` : `<span class="file-chip">📄 ${esc(file.name)}</span>`).join("");
  article.innerHTML = `<div class="avatar">${message.role === "user" ? "أنت" : "AI"}</div><div class="bubble"><div class="meta">${message.role === "user" ? "أنت" : esc(message.modelName || selectedModelLabel())} • ${format(message.time)}</div>${attachments ? `<div class="attachments">${attachments}</div>` : ""}<div class="content">${streaming ? '<p>جاري بدء الرد…</p>' : md(message.text)}</div>${streaming ? "" : '<div class="msg-actions"><button data-copy>نسخ</button></div>'}</div>`;
  chat.appendChild(article); bindMessage(article, message); return article;
}
function bindMessage(article, message) {
  article.querySelector("[data-copy]")?.addEventListener("click", async () => { await navigator.clipboard.writeText(message.text); toast("تم النسخ"); });
  article.querySelectorAll(".copyCode").forEach(button => button.onclick = async () => { await navigator.clipboard.writeText(button.closest(".code").querySelector("code").innerText); toast("تم نسخ الكود"); });
}
function render() {
  const current = getActive();
  if (!current?.messages.length) return welcome();
  chat.innerHTML = ""; current.messages.forEach(message => renderMessage(message));
  requestAnimationFrame(() => { scrollToBottom(false); updateJumpButton(); });
}
function renderHistory() {
  const query = $("#historySearch").value.trim().toLowerCase();
  let all = chats().sort((a,b) => b.time - a.time);
  if (query) all = all.filter(item => `${item.title} ${item.messages.map(m => m.text).join(" ")}`.toLowerCase().includes(query));
  $("#history").innerHTML = "";
  all.forEach(item => {
    const row = document.createElement("div"); row.className = "hist";
    row.innerHTML = `<button class="hist-main ${item.id === activeId ? "active" : ""}"><div class="hist-title">${esc(item.title)}</div><div class="hist-date">${format(item.time)}</div></button><button class="hist-del" title="حذف">🗑</button>`;
    row.querySelector(".hist-main").onclick = () => { activeId = item.id; render(); renderHistory(); closeSide(); };
    row.querySelector(".hist-del").onclick = () => { if (!confirm("حذف المحادثة؟")) return; const remaining = chats().filter(x => x.id !== item.id); save(remaining); if (activeId === item.id) activeId = remaining[0]?.id || null; ensureChat(); render(); renderHistory(); };
    $("#history").appendChild(row);
  });
}
function renderPreview() {
  preview.innerHTML = "";
  pending.forEach((file, index) => {
    const item = document.createElement("div"); item.className = "preview-item";
    item.innerHTML = `${file.type.startsWith("image/") ? `<img src="${file.data}" alt="">` : '<div style="font-size:30px">📄</div>'}<span>${esc(file.name)}</span><button aria-label="حذف">×</button>`;
    item.querySelector("button").onclick = () => { pending.splice(index, 1); renderPreview(); };
    preview.appendChild(item);
  });
}
async function readFiles(fileList) {
  for (const file of [...fileList].slice(0, MAX_FILES - pending.length)) {
    if (!ALLOWED.has(file.type)) { toast(`نوع غير مدعوم: ${file.name}`); continue; }
    if (file.size > MAX_FILE_BYTES) { toast(`الملف أكبر من 8MB: ${file.name}`); continue; }
    if (file.type === "text/plain" || file.type === "text/csv") {
      const text = (await file.text()).slice(0, 100000);
      pending.push({ name:file.name, type:"text/plain", text });
    } else {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      pending.push({ name:file.name, type:file.type, data });
    }
  }
  renderPreview();
}
function serializeMessages(messages) {
  return messages.map(message => ({
    role: message.role,
    text: message.text + (message.files || []).filter(f => f.type === "text/plain").map(f => `\n\n--- محتوى الملف ${f.name} ---\n${f.text || ""}`).join(""),
    files: (message.files || []).filter(f => f.type !== "text/plain")
  }));
}
async function generate() {
  generating = true; sendBtn.textContent = "إيقاف ■"; sendBtn.classList.add("stop"); controller = new AbortController();
  const modelName = selectedModelLabel();
  const draft = { id:uid(), role:"assistant", text:"", time:Date.now(), modelName };
  const article = renderMessage(draft, true); const content = article.querySelector(".content");
  let fullText = "", buffer = "", renderQueued = false;
  const paint = () => {
    renderQueued = false;
    content.innerHTML = md(fullText) + '<span class="stream-caret"></span>';
    bindMessage(article, draft);
    if (userPinnedToBottom) scrollToBottom(false); else updateJumpButton();
  };
  try {
    const response = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, signal:controller.signal, body:JSON.stringify({ model:modelSelect.value, modelName, memory:localStorage.getItem(MEMORY)||"", messages:serializeMessages(getActive().messages) }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `خطأ ${response.status}`); }
    const reader = response.body.getReader(); const decoder = new TextDecoder();
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      buffer += decoder.decode(value,{stream:true});
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim(); if (!raw || raw === "[DONE]") continue;
        try { const chunk = JSON.parse(raw); const token = chunk.choices?.[0]?.delta?.content; if (typeof token === "string") { fullText += token; if (!renderQueued) { renderQueued = true; requestAnimationFrame(paint); } } } catch {}
      }
    }
    if (!fullText) throw new Error("لم يصل رد نصي من النموذج.");
    draft.text = fullText; mutate(current => current.messages.push(draft)); content.innerHTML = md(fullText); article.querySelector(".bubble").insertAdjacentHTML("beforeend", '<div class="msg-actions"><button data-copy>نسخ</button></div>'); bindMessage(article,draft); updateJumpButton();
  } catch (error) {
    if (error.name === "AbortError") article.remove(); else content.innerHTML = `<p style="color:var(--danger)">${esc(error.message)}</p>`;
  } finally { generating = false; controller = null; sendBtn.textContent = "إرسال ↑"; sendBtn.classList.remove("stop"); }
}
async function send() {
  if (generating) { controller?.abort(); return; }
  if (!promptEl.value.trim() && !pending.length) return;
  ensureChat(); const text = promptEl.value.trim() || "حلّل الملفات المرفقة.";
  const message = { id:uid(), role:"user", text, files:[...pending], time:Date.now() };
  mutate(current => { current.messages.push(message); if (current.messages.length === 1) current.title = text.slice(0,45); });
  promptEl.value = ""; promptEl.style.height = "auto"; pending = []; renderPreview(); render(); userPinnedToBottom = true; await generate();
}
function openModal(id) { closeSide(); document.querySelectorAll(".modal").forEach(x => x.classList.remove("open")); $("#"+id).classList.add("open"); $("#overlay").classList.add("show"); }
function closeModal() { document.querySelectorAll(".modal").forEach(x => x.classList.remove("open")); $("#overlay").classList.remove("show"); }
function closeSide() { $("#sidebar").classList.remove("open"); $("#drawerOverlay").classList.remove("show"); }

chat.addEventListener("scroll", updateJumpButton, {passive:true});
jumpBottom.onclick = () => { userPinnedToBottom = true; scrollToBottom(true); };
$("#menuBtn").onclick = () => { $("#sidebar").classList.add("open"); $("#drawerOverlay").classList.add("show"); };
$("#closeSide").onclick = closeSide; $("#drawerOverlay").onclick = closeSide; $("#overlay").onclick = closeModal;
document.querySelectorAll(".closeModal").forEach(button => button.onclick = closeModal);
$("#newChat").onclick = () => { activeId = null; ensureChat(); render(); renderHistory(); closeSide(); };
$("#historySearch").oninput = renderHistory; $("#sendBtn").onclick = send;
promptEl.onkeydown = event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } };
promptEl.oninput = () => { promptEl.style.height = "auto"; promptEl.style.height = `${Math.min(promptEl.scrollHeight,130)}px`; };
$("#fileBtn").onclick = () => $("#fileInput").click(); $("#cameraBtn").onclick = () => $("#cameraInput").click();
$("#fileInput").onchange = event => { readFiles(event.target.files); event.target.value = ""; }; $("#cameraInput").onchange = event => { readFiles(event.target.files); event.target.value = ""; };
$("#themeBtn").onclick = () => { document.body.classList.toggle("dark"); localStorage.setItem(THEME,document.body.classList.contains("dark")?"dark":"light"); };
$("#settingsBtn").onclick = () => { $("#memoryInput").value = localStorage.getItem(MEMORY)||""; openModal("settingsModal"); };
$("#saveSettings").onclick = () => { localStorage.setItem(MEMORY,$("#memoryInput").value.slice(0,4000)); closeModal(); toast("تم حفظ الإعدادات"); };
modelSelect.onchange = () => localStorage.setItem(MODEL,modelSelect.value);

document.body.classList.toggle("dark",localStorage.getItem(THEME)==="dark");
const savedModel = localStorage.getItem(MODEL); if ([...modelSelect.options].some(o=>o.value===savedModel)) modelSelect.value=savedModel;
const all = chats(); activeId = all.sort((a,b)=>b.time-a.time)[0]?.id||null; ensureChat(); renderHistory(); render();
