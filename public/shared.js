// shared.js
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  if (!Array.isArray(children)) children = [children];
  for (const c of children) {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  }
  return node;
}

// Minimal, safe markdown -> HTML
function markdownToHtml(text = '') {
  return text
    // headings
    .replace(/^### (.*)$/gim, '<h3>$1</h3>')
    .replace(/^## (.*)$/gim, '<h2>$1</h2>')
    .replace(/^# (.*)$/gim, '<h1>$1</h1>')
    // bold/italic
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // code
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    // line breaks
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .trim();
}

function renderMessage(msg) {
  const isUser = msg.role === 'user';
  const row = el('div', { class: 'chat-row ' + (isUser ? 'user' : 'assistant') });
  const avatar = el('div', { class: 'avatar' }, isUser ? 'U' : 'G');
  const bubble = el('div', { class: 'bubble', html: markdownToHtml(msg.content) });
  row.append(avatar, bubble);
  return row;
}

function renderStreamingStart() {
  const row = el('div', { class: 'chat-row assistant' });
  const avatar = el('div', { class: 'avatar' }, 'G');
  const bubble = el('div', { class: 'bubble', id: 'streamBubble' },
    el('span', { id: 'streamText' }, '') // plain during stream; replaced with HTML on done
  );
  row.append(avatar, bubble);
  return row;
}

function scrollToBottom(c) { c.scrollTop = c.scrollHeight; }

export { el, renderMessage, renderStreamingStart, scrollToBottom, markdownToHtml };
