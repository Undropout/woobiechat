
const firebaseConfig = {
  apiKey: "AIzaSyBuSQkpBwmggXK38mzmUxiClweWiKxD5bI",
  authDomain: "woobiedinobear.firebaseapp.com",
  projectId: "woobiedinobear",
  storageBucket: "woobiedinobear.firebasestorage.app", // Correct!
  messagingSenderId: "642703845433",
  appId: "1:642703845433:web:56be57a1da63e1ecbd85e8"
};

window.onload = function () {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-img");
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("woobie-img")) {
      modal.style.display = "flex";
      modalImg.src = e.target.dataset.full || e.target.src;
    } else if (e.target === modal) {
      modal.style.display = "none";
      modalImg.src = "";
    }
  });
};
firebase.initializeApp(firebaseConfig);

const db = firebase.database();




function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const matchId = getQueryParam("matchId") || "default";
const chatRef = db.ref("chatroom/" + matchId);

const usernameFromURL = getQueryParam("user");
if (usernameFromURL) {
  const usernameInput = document.getElementById("username");
  usernameInput.value = usernameFromURL;
  usernameInput.setAttribute("readonly", "true");
  usernameInput.setAttribute("aria-readonly", "true");
  usernameInput.setAttribute("tabindex", "-1");
}

const pingSound = new Audio("ping.mp3");
let originalTitle = document.title;
let flashInterval = null;
let windowFocused = true;

window.addEventListener("focus", () => {
  windowFocused = true;
  document.title = originalTitle;
  clearInterval(flashInterval);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "flex") {
    modal.style.display = "none";
    modalImg.src = "";
  }
});

window.addEventListener("blur", () => {
  windowFocused = false;
});

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

chatRef.on("child_added", function (snapshot) {
  const msg = snapshot.val();
  const messageEl = document.createElement("div");
  const messagesContainer = document.getElementById("messages");
  const currentUser = document.getElementById("username").value.trim();

  let timestamp = new Date();
  if (msg.timestamp && !isNaN(msg.timestamp)) {
    timestamp = new Date(Number(msg.timestamp));
  }

  const timeStr = timestamp.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const parsedText = msg.text.replace(/::(.*?)::/g, '<span class="emote">::$1::</span>');
  let content = `<span class="timestamp">[${timeStr}]</span> ${msg.name}: ${parsedText}`;
  if (msg.imageUrl) {
    content += `<div><img src="${msg.imageUrl}" data-full="${msg.fullImageUrl}" alt="${msg.text}" class="woobie-img" style="max-width: 128px" border: 1px solid #33ff33; margin-top: 0.5rem; cursor: pointer;" /></div>`;
  }
  
  

  messageEl.innerHTML = content;

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

let lastImageTimestamp = 0;
async function processImage(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise(res => img.onload = res);

  const maxDim = 512; // instead of 128

  const scale = Math.min(maxDim / img.width, maxDim / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Disable smoothing (no blur when shrinking)
  ctx.imageSmoothingEnabled = false;

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Desaturate + levels + posterize
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let min = 255, max = 0;
  // First pass: convert to grayscale and find min/max
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    min = Math.min(min, gray);
    max = Math.max(max, gray);
    data[i] = data[i+1] = data[i+2] = gray;
  }

  // Second pass: apply levels and posterize
  for (let i = 0; i < data.length; i += 4) {
    let norm = (data[i] - min) / (max - min);
    norm = Math.min(1, Math.max(0, norm));
    let poster = Math.floor(norm * 4) / 3; // 0, 1/3, 2/3, 1
    let level = Math.round(poster * 255);
    data[i] = data[i+1] = data[i+2] = level;
  }

  ctx.putImageData(imageData, 0, 0);

  // Overlay yellow using multiply blend mode
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "#FFFF00";
  ctx.fillRect(0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

function sendImage() {
  const fileInput = document.getElementById("image-upload");
  const altInput = document.getElementById("image-alt");
  const username = document.getElementById("username").value.trim();

  if (!fileInput.files.length || !altInput.value.trim()) {
    alert("Please select an image and write an alt description.");
    return;
  }

  const file = fileInput.files[0];
  const altText = altInput.value.trim();
  const timestamp = Date.now();

  const imageLog = JSON.parse(localStorage.getItem("woobie-images") || "{}");
  const today = new Date().toDateString();
  const userLog = imageLog[username] || [];
  const todayCount = userLog.filter(item => item.date === today).length;
  

  if (todayCount >= 5) {
    alert("You can only send 5 images per day.");
    return;
  }

  const matchId = getQueryParam("matchId") || "default";
  const storageRef = firebase.storage().ref();
  const thumbPath = `chatImages/${matchId}/thumb_${timestamp}_${file.name}`;
  const thumbRef = storageRef.child(thumbPath);

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const maxDim = 128;
      const scale = maxDim / Math.max(img.width, img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Grayscale
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }

// Levels + Posterization (to 4 colors)
let min = 255, max = 0;
for (let i = 0; i < data.length; i += 4) {
  min = Math.min(min, data[i]);
  max = Math.max(max, data[i]);
}

for (let i = 0; i < data.length; i += 4) {
  let norm = (data[i] - min) / (max - min);
  norm = Math.min(1, Math.max(0, norm));
  let poster = Math.floor(norm * 4) / 3; // Only 4 bands: 0, 1/3, 2/3, 1
  let level = Math.round(poster * 255);
  data[i] = data[i+1] = data[i+2] = level;
}
ctx.putImageData(imageData, 0, 0);
      // Multiply yellow overlay
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = "#FFFF00";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      canvas.toBlob(function (blob) {
        thumbRef.put(blob).then(thumbSnap => {
          return thumbSnap.ref.getDownloadURL().then(thumbUrl => {
            chatRef.push({
              name: username,
              text: `[Image: ${altText}]`,
              imageUrl: thumbUrl,           // Used in chat
              fullImageUrl: thumbUrl,       // Used in modal zoom
              timestamp: timestamp
            });

            fileInput.value = "";
            altInput.value = "";

            userLog.push({ date: today, time: timestamp });
            imageLog[username] = userLog;
            localStorage.setItem("woobie-images", JSON.stringify(imageLog));
            
          });
        }).catch(err => {
          console.error("Upload failed", err);
          alert("Upload failed. Try again.");
        });
      }, "image/png");
      
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}



