const matchId = "YOUR_MATCH_ID_HERE"; // Replace with real match ID
const senderId = "YOUR_USER_ID_HERE"; // Replace with real user ID

const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

async function fetchMessages() {
  const res = await fetch(`http://localhost:5000/api/messages/${matchId}`);
  const data = await res.json();
  chatLog.innerHTML = '';
  (data.messages || []).forEach(msg => {
    const el = document.createElement('div');
    el.textContent = `🕒 ${new Date(msg.timestamp).toLocaleTimeString()} > ${msg.content}`;
    chatLog.appendChild(el);
  });
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = chatInput.value.trim();
  if (!content) return;

  await fetch(`http://localhost:5000/api/messages/${matchId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, content })
  });

  chatInput.value = '';
  fetchMessages();
});

setInterval(fetchMessages, 2000); // Poll every 2 seconds
fetchMessages();
