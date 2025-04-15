const firebaseConfig = {
  apiKey: "AIzaSyBuSQkpBwmggXK38mzmUxiClweWiKxD5bI",
  authDomain: "woobiedinobear.firebaseapp.com",
  projectId: "woobiedinobear",
  storageBucket: "woobiedinobear.firebasestorage.app",
  messagingSenderId: "642703845433",
  appId: "1:642703845433:web:56be57a1da63e1ecbd85e8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 🧠 Get matchId from URL to allow separate rooms per match
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const matchId = getQueryParam("matchId") || "default";
const chatRef = db.ref("chatroom/" + matchId);

// 🔒 Lock in username from URL
const usernameFromURL = getQueryParam("user");
if (usernameFromURL) {
  const usernameInput = document.getElementById("username");
  usernameInput.value = usernameFromURL;
  usernameInput.setAttribute("readonly", "true");
  usernameInput.setAttribute("aria-readonly", "true");
  usernameInput.setAttribute("tabindex", "-1");
}

// 🔊 Sound and focus logic
const pingSound = new Audio("ping.mp3");
let originalTitle = document.title;
let flashInterval = null;
let windowFocused = true;

window.addEventListener("focus", () => {
  windowFocused = true;
  document.title = originalTitle;
  clearInterval(flashInterval);
  flashInterval = null;
});

window.addEventListener("blur", () => {
  windowFocused = false;
});

// 💬 Send message
function sendMessage() {
  const username = document.getElementById("username").value.trim();
  const message = document.getElementById("message").value.trim();
  if (username && message) {
    chatRef.push({
      name: username,
      text: message,
      timestamp: Date.now()

    });
    document.getElementById("message").value = "";
  }
}


// ⌨️ Enter = send
document.getElementById("message").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
function insertEmote(emoteName) {
  const input = document.getElementById("message");
  const current = input.value;
  input.value = current + ` ::${emoteName}:: `;
  input.focus();
}

// 🧾 Listen for messages
chatRef.on("child_added", function (snapshot) {
  const msg = snapshot.val();
  const messageEl = document.createElement("div");
  const messagesContainer = document.getElementById("messages");
  const currentUser = document.getElementById("username").value.trim();
  const parsedText = msg.text.replace(/::(.*?)::/g, '<span class="emote">::$1::</span>');
  let timestamp = new Date();
  if (msg.timestamp && !isNaN(msg.timestamp)) {
    timestamp = new Date(Number(msg.timestamp));
  }
  

  const timeStr = timestamp.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  
  messageEl.innerHTML = `<span class="timestamp">[${timeStr}]</span> ${msg.name}: ${parsedText}`;
  
  

  if (msg.name === currentUser) {
    messageEl.classList.add("my-message");
  } else if (msg.name === "WOOBIE" || msg.name.toLowerCase().includes("system")) {
    messageEl.classList.add("system-message");
  } else if (msg.text.startsWith("::") || msg.text.match(/^\/me\s+/)) {
    messageEl.classList.add("emote-message");
  } else {
    messageEl.classList.add("other-message");
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  pingSound.play().catch(e => console.log("Audio blocked until user interaction"));

  if (!windowFocused && !flashInterval) {
    flashInterval = setInterval(() => {
      document.title = document.title === "💬 New Message!" ? originalTitle : "💬 New Message!";
    }, 1000);
  }
});
