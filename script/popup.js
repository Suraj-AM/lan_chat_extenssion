document.addEventListener("DOMContentLoaded", function () {
  const messages = document.getElementById("messages");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const fileInput = document.getElementById("fileInput");

  const socket = new WebSocket("ws://192.168.0.200:3011");

  socket.onopen = function (event) {
    console.log("Connected to server");
    appendMessage("Connected!");
  };

  socket.onmessage = function (event) {
    if (typeof event.data === 'string') {
        // Handle JSON messages
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (error) {
            console.error("Error parsing JSON message:", error);
            return;
        }
        if (data.type === "text") {
            appendMessage(data.content);
        }
    } else if (event.data instanceof Blob) {
        // Handle Blob messages (e.g., file data)
        appendMessage("File received");
        const blob = event.data;
        console.log(blob);
        const reader = new FileReader();
        reader.onload = function () {
            appendMessage(`<strong>File received:</strong> <a href="${reader.result}" target="_blank">Download</a>`);
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
          content: reader.result, // Extract base64 string from data URL
          contentType: file.type,
          fileName: file.name
        };
        socket.send(JSON.stringify(fileData));
        appendMessage("File sent!");
      };
      reader.readAsDataURL(file); // Read file as data URL
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
