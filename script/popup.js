document.addEventListener("DOMContentLoaded", function () {
  const messages = document.getElementById("messages");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const fileInput = document.getElementById("fileInput");
  const attachment = document.getElementById("attachment");
  const fileList = document.getElementById("list");

  messageInput.placeholder = "Press `ENTER` for send message `SHIFT + ENTER` for multiple lines ..."


  let socket;
  let messageQueue = [];
  let selectedFile;

  // Load messages from localStorage when the page loads
  loadMessages();

  function loadMessages() {
    const savedMessages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    appendMessage(savedMessages.join("<br>"), false);
  }

  function connectToSocket() {
    try {
      socket = new WebSocket("ws://192.168.0.200:3011");
      socket.onopen = function (event) {
        appendMessage("<br>Connected to server", false);
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
      // Handle JSON messages
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Error parsing JSON message:", error);
      appendMessage("message Received But failed to parse", false);
      return;
    }

    if (data.type === "text") {

      appendMessage(data.content, true);

    } else if (data.type == 'file') {
      // Handle Blob messages (e.g., file data)
      appendMessage(`File Received! from &nbsp; ${data.ip}`, true)
      const blob = new Blob([deserializeArrayBuffer(data.content)], { type: data.contentType }); // Deserialize ArrayBuffer
      const reader = new FileReader();
      reader.onload = function () {
        const downloadLink = `<br><strong>${data.ip}:</strong><br><strong>File received:</strong>
               <a href="${reader.result}" download="${data.fileName}" target="_blank"> ${data.fileName}</a>`;
        appendMessage(downloadLink, false);
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
    if (selectedFile) {
      messageQueue.push(selectedFile);
      removeFile();
    }
    if (message.trim() !== "") {
      appendMessage(`<br><strong>YOU</strong>:<br>${escapeHtml(message.trim())}`, true);
      sendMessage({ type: "text", content: escapeHtml(message) });
      messageInput.value = "";
    } else {
      sendQueuedMessages();
    }
  });

  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const message = messageInput.value;
      messageInput.value = "";
      if (message.trim() !== "") {
        appendMessage(`<br><strong>YOU</strong>:<br>${escapeHtml(message.trim())}`);
        sendMessage({ type: "text", content: escapeHtml(message) });
      }
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
      // sendMessage(fileData);
      selectedFile = fileData
      addFileInList()
    };
    reader.readAsArrayBuffer(file); // Read file as ArrayBuffer

    fileInput.value = ''
  });



  function addFileInList() {
    attachment.style.display = 'none';
    const fileElement = document.createElement("li");
    fileElement.classList = 'file-item'
    fileElement.innerHTML = `<a> <img src="./icons/paperclip.svg" height="10rem">&nbsp;${selectedFile.fileName} </a>
      <span class="close middleRemove" style="font-size: 0.8rem;" id="selectedFile" >
        <img src="./icons/x.svg" height="10rem">Remove</span>`;
    fileList.appendChild(fileElement)
    addEventListenerOnSelectedFile();
  }

  function addEventListenerOnSelectedFile() {
    const selectedFileDom = document.getElementById('selectedFile')
    selectedFileDom.addEventListener('click', function (event) {
      attachment.style.display = 'block';
      fileList.innerHTML = '';
      event.stopPropagation(); // Prevent the click event from bubbling up
    })
  }

  function removeFile(params) {
    attachment.style.display = 'block';
    fileList.innerHTML = '';
    selectedFile = null
  }


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
