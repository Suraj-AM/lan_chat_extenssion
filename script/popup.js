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
  let selectedFile = [];

  // Load messages from localStorage when the page loads
  loadMessages();

  // connect to socket
  connectToSocket();


  function loadMessages() {
    const savedMessages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    appendMessage(savedMessages.join("<br>"), false);
  }

  function connectToSocket() {
    try {
      socket = new WebSocket("ws://192.168.0.145:3011");
      socket.onopen = function (event) {
        appendMessage("<br>Connected to server", false);
        sendQueuedMessages();

        socket.onmessage = async function (event) {
          await handleMessageOfSocket(event)
        };

        socket.onerror = function (error) {
          console.error("WebSocket error:", error);
        };

        socket.onclose = function (event) {
          appendMessage("Connection closed\n", false)
        };
        return true;
      };
    } catch (error) {
      console.log("error", error);
      appendMessage("<strong></strong>connection Failed</strong>", false)
      return false;
    }
  }


  async function handleMessageOfSocket(event) {
    let data;
    try {
      // Handle JSON messages
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Error parsing JSON message:", error);
      appendMessage("message Received But failed to parse", false);
      return;
    }
    if (data.text || data.files) {
      if (data.text) {
        const htmlMessage = `<br><strong>${data.from}:</strong><br>${escapeHtml(data.text)}`;
        appendMessage(htmlMessage, true);
      }

      if (Array.isArray(data.files)) {
        await addFiles(data.files, data.from)

      }
    } else {
      console.error("Unexpected message type:", event.data);
    }
  }


  async function addFiles(files, from) {
    appendMessage(`<br><strong>File/s Received! from &nbsp; ${from}<strong>`, true)
    await asyncForEach(files, (file) => {
      // Handle Blob messages (e.g., file data)

      const blob = new Blob([deserializeArrayBuffer(file.content)], { type: file.contentType }); // Deserialize ArrayBuffer
      const reader = new FileReader();

      reader.onload = function () {
        const downloadLink = `<a href="${reader.result}" download="${file.fileName}" target="_blank"> ${file.fileName}</a>`;
        appendMessage(downloadLink, false);
      };

      reader.readAsDataURL(blob);
    });
  }



  // Handle send button click
  sendButton.addEventListener("click", function () {
    const message = messageInput.value;
    let payload = {}
    if (message.trim() !== "" || selectedFile.length > 0) {
      if (message.trim() !== "") {
        appendMessage(`<br><strong>YOU</strong>:<br>${escapeHtml(message.trim())}`, true);
        messageInput.value = "";
        payload.text = escapeHtml(message);
      }

      if (selectedFile.length > 0) {
        payload = {
          ...payload,
          files: selectedFile
        }
        removeFile();
      }
      sendMessage(payload);
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
        let payload = { text: escapeHtml(message) }
        if (selectedFile.length > 0) {
          payload = {
            ...payload,
            files: selectedFile
          }
          removeFile();
        }
        sendMessage(payload);
      }
    }
  });

  attachment.addEventListener("click", function () {
    fileInput.click()
  })

  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      if (selectedFile.length > 0) {
        sendButton.click()
      }
    }
  })
  // Handle file input change
  fileInput.addEventListener("change", async function (event) {
    const files = event.target.files;

    if (files.length < 1) {
      console.error("No file selected");
      return;
    }

    await asyncForEach(files, (file, i) => {
      console.log(file);
      const reader = new FileReader();
      reader.onload = async function (event) {
        const fileData = {
          index: selectedFile.length,
          content: await serializeArrayBuffer(event.target.result), // Serialize ArrayBuffer
          contentType: file.type,
          fileName: file.name
        };
        // sendMessage(fileData);
        selectedFile.push(fileData)
        addFileInList(file.name, i)
      };
      reader.readAsArrayBuffer(file); // Read file as ArrayBuffer

    });

    fileInput.value = ''
  });

  /**
   * Async for each
   */
  const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  };

  function addFileInList(name, index) {
    // attachment.style.display = 'none';
    const fileElement = document.createElement("li");
    fileElement.classList = 'file-item'
    fileElement.id = `list${index}`
    fileElement.innerHTML = `<a> <img src="./icons/paperclip.svg" height="10rem">&nbsp;${name} </a>
      <span class="close middleRemove" style="font-size: 0.8rem;" id="selectedFile${index}" >
        <img src="./icons/x.svg" height="10rem">Remove</span>`;
    fileList.appendChild(fileElement)
    addEventListenerOnSelectedFile(`selectedFile${index}`, index);
  }

  function addEventListenerOnSelectedFile(id, index) {
    const ele = document.getElementById(id)
    ele.addEventListener('click', function (event) {
      // attachment.style.display = 'block';
      const listItem = document.getElementById(`list${index}`)
      listItem.remove();
      selectedFile = selectedFile.filter(file => file.index !== index);

      event.stopPropagation(); // Prevent the click event from bubbling up
    })
  }

  function removeFile() {
    // attachment.style.display = 'block';
    fileList.innerHTML = '';
    selectedFile = []
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
