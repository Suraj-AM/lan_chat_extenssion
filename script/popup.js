document.addEventListener("DOMContentLoaded", function () {
  const messages = document.getElementById("messages");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const fileInput = document.getElementById("fileInput"); // New file input element

  const socket = new WebSocket("ws://192.168.0.200:3011");

  socket.onopen = function (event) {
    console.log("Connected to server");
    appendMessage("connected!");
  };

  socket.onmessage = function (event) {
    let data = JSON.parse(event.data);
    if (data.type === "text") {
      appendMessage(data.content);
    } else if (data instanceof Blob) { // Check if the received data is a file
      // Handle received file
      const reader = new FileReader();
      reader.onload = function () {
        appendMessage(`<strong>File received:</strong> <a href="${reader.result}" download>${data.fileName}</a>`);
      };
      reader.readAsDataURL(data);
    }
  };

  socket.onerror = function (error) {
    console.error("WebSocket error:", error);
  };

  socket.onclose = function (event) {
    console.log("Connection closed");
  };

  // Handle send button click
  sendButton.addEventListener("click", function () {
    const message = messageInput.value;
    if (message.trim() !== "") {
      appendMessage(`<br><strong>YOU</strong>:<br>${escapeHtml(message.trim())}`);
      socket.send(JSON.stringify({ type: "text", content: message }));
      messageInput.value = "";
    }
  });

  // Handle file input change
  fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        const fileData = {
          type: "file",
          content: reader.result,
          fileName: file.name
        };
        socket.send(JSON.stringify(fileData));
        appendMessage("file send!");
      };
      reader.readAsArrayBuffer(file);
      document.getElementById("fileInput").value = "";
    }
  });

  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      const message = messageInput.value;
      if (message.trim() !== "") {
        appendMessage(`<br><strong>YOU</strong>:<br>${escapeHtml(message.trim())}`);
        socket.send(JSON.stringify({ type: "text", content: message }));
        messageInput.value = "";
      }
    }
  });

  // Function to append a new message to the chat window
  function appendMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.innerHTML = message;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
  }

  // Function to escape HTML entities
  function escapeHtml(html) {
    return html
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }
});
