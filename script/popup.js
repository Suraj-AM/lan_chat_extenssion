document.addEventListener("DOMContentLoaded", function () {
  const messages = document.getElementById("messages");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const fileInput = document.getElementById("fileInput");
  const attachment = document.getElementById("attachment");


  let socket;
  let messageQueue = [];

  // Load messages from localStorage when the page loads
  loadMessages();

  function loadMessages() {
    const savedMessages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.innerHTML = savedMessages.join("\n");
  }

  function connectToSocket() {
    try {
      socket = new WebSocket("ws://192.168.0.200:3011");
      socket.onopen = function (event) {
        appendMessage("Connected to server", false);
        return true;
      };
    } catch (error) {
      return false;
    }
  }
  connectToSocket();

  socket.onmessage = function (event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Error parsing JSON message:", error);
      appendMessage("message Received But failed to parse", false);
      return;
    }

    if (data.type === 'string') {
      // Handle JSON messages
      if (data.type === "text") {
        appendMessage(data.content, true);
      }
    } else if (data.type == 'file') {
      // Handle Blob messages (e.g., file data)
      appendMessage("File received", true);
      const blob = new Blob([deserializeArrayBuffer(data.content)], { type: data.contentType }); // Deserialize ArrayBuffer
      const reader = new FileReader();
      reader.onload = function () {
        const downloadLink = `<strong>File received:</strong>
               <a href="${reader.result}" download="${data.fileName}" target="_blank">Download file ${data.fileName}</a>`;
        appendMessage(downloadLink, true);
      };

      reader.readAsDataURL(blob);

    } else {
      console.error("Unexpected message type:", event.data);
    }
  };

  socket.onerror = function (error) {
    console.error("WebSocket error:", error);
  };

  socket.onclose = function (event) {
    appendMessage("Connection closed\n", false)
  };

  // Handle send button click
  sendButton.addEventListener("click", function () {
    const message = messageInput.value;
    if (message.trim() !== "") {
      appendMessage(`<br><strong>YOU</strong>:<br>${escapeHtml(message.trim())}`, true);
      sendMessage({ type: "text", content: escapeHtml(message) });
      messageInput.value = "";
    }
  });
  attachment.addEventListener("click", function () {
    fileInput.click()
  })

  // Handle file input change
  fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (!file) {
      console.error("No file selected");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const fileData = {
        type: "file",
        content: serializeArrayBuffer(event.target.result), // Serialize ArrayBuffer
        contentType: file.type,
        fileName: file.name
      };
      sendMessage(fileData);
    };
    reader.readAsArrayBuffer(file); // Read file as ArrayBuffer

    fileInput.value = ''
  });

  function appendMessage(message, save) {
    const messageElement = document.createElement("div");
    messageElement.innerHTML = message;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;

    if (save) {
      // Save the message in localStorage
      const savedMessages = JSON.parse(localStorage.getItem("chatMessages")) || [];
      savedMessages.push(message);
      localStorage.setItem("chatMessages", JSON.stringify(savedMessages));
    }
  }

  function sendMessage(message) {
    if (socket.readyState === WebSocket.CONNECTING) {
      // If the WebSocket is still connecting, add the message to the queue
      messageQueue.push(message);
    } else if (socket.readyState === WebSocket.OPEN) {
      // If the WebSocket is open, send the message
      sendQueuedMessages(); // Send any queued messages before sending the current one
      try {
        const stringifiedData = JSON.stringify(message);
        socket.send(stringifiedData);
      } catch (err) {
        appendMessage(`Error to send message ${message}`, false);
        messageQueue.push(message);
      }
    } else {
      // If the WebSocket is closed, reconnect and add the message to the queue
      connectToSocket(); // Reconnect to the WebSocket
      messageQueue.push(message);
    }
  }

  function sendQueuedMessages() {
    // Send all queued messages
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      try {
        const stringifiedData = JSON.stringify(message);
        socket.send(stringifiedData);
      } catch (err) {
        appendMessage(`Error to send message ${message}`, false);
      }
    }
  }

  function serializeArrayBuffer(arrayBuffer) {
    const binary = [];
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary.push(String.fromCharCode(bytes[i]));
    }
    return btoa(binary.join(''));
  }

  // Function to deserialize Base64 to ArrayBuffer
  function deserializeArrayBuffer(serialized) {
    const binary = atob(serialized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Function to escape HTML entities
  function escapeHtml(html) {
    return html
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }
});
