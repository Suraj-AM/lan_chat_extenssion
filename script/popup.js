document.addEventListener("DOMContentLoaded", function () {
  const messages = document.getElementById("messages");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const fileInput = document.getElementById("fileInput");
  const attachment = document.getElementById("attachment");
  const fileList = document.getElementById("list");

  messageInput.placeholder = "Press `ENTER` for send message `SHIFT + ENTER` for multiple lines ..."

  let selectedFile = [];

  // Load messages from localStorage when the page loads
  loadMessages();

  // set popup name for detect in background
  chrome.runtime.connect({ name: "messageBox" });

  // Example: Listen for messages from the background script
  chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    if (sender.id === chrome.runtime.id) {
      // Handle the message received
      await handleMessageOfSocket(message)
    }
  });


  function loadMessages() {
    getMessagesFromStorage((savedMessages) => {
      console.log(savedMessages);
      if (savedMessages.length > 0) {
        let action = ''
        savedMessages.forEach(message => {
          switch (message.from) {
            case 'YOU':
              action = "SENT"
              break;
            case 'CONNECTION_ESTABLISHED':
              delete message.from
              action = "CONNECTION_ESTABLISHED"
              break;
            case 'CONNECTION_END':
              delete message.from
              action = "CONNECTION_END"
              break;

            default:
              action = "RECEIVED"
              break;
          }
          appendMessage(message.message, message.from, false, action);
        });
      }
    });
  }

  function getMessagesFromStorage(callback) {
    // Retrieve the stored messages
    chrome.storage.local.get("chatMessages", (result) => {
      const savedMessages = result.chatMessages || [];

      // Pass the retrieved messages to the callback function
      callback(savedMessages);
    });
  }


  async function handleMessageOfSocket(event) {
    let data;
    try {
      // Handle JSON messages
      data = JSON.parse(event);
    } catch (error) {
      console.error("Error parsing JSON message:", error);
      appendMessage("Message Received but Failed to Parse", null, false, 'CONNECTION_END');
      return;
    }
    if (data.text || data.files) {
      if (data.text) {
        appendMessage(escapeHtml(data.text), data.from, true, 'RECEIVED');
      }

      if (Array.isArray(data.files)) {
        await addFiles(data.files, data.from)

      }
    } else {
      console.error("Unexpected message type:", event.data);
    }
  }

  function sendMessage(message) {
    chrome.runtime.sendMessage(message);
  }


  async function addFiles(files, from) {
    appendMessage(`<strong>File/s Received! from &nbsp; ${from}<strong>`, null, true, 'RECEIVED');
    await asyncForEach(files, (file) => {
      // Handle Blob messages (e.g., file data)

      const blob = new Blob([deserializeArrayBuffer(file.content)], { type: file.contentType }); // Deserialize ArrayBuffer
      const reader = new FileReader();
      const fileExtension = file.fileName.split('.').pop();
      const color = generateColor(fileExtension)

      reader.onload = function () {
        const downloadLink = `<a href="${reader.result}" download="${file.fileName}" target="_blank">
        <div class="file-received fold" style="background:${color}">.${fileExtension}</div>
        <div style="margin-top:.1rem">${file.fileName.trim()}</div>
        </a>`;
        appendMessage(downloadLink, null, false, 'RECEIVED');
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
        payload.text = message.trim();
        appendMessage(escapeHtml(message.trim()), 'YOU', true, 'SENT');
        messageInput.value = "";
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
      sendMessage();
    }
  });

  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const message = messageInput.value;
      messageInput.value = "";
      if (message.trim() !== "") {

        appendMessage(escapeHtml(message.trim()), 'YOU', true, 'SENT');

        let payload = { text: message.trim() };

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
      const reader = new FileReader();
      reader.onload = async function (event) {
        const fileData = {
          index: selectedFile.length,
          content: await serializeArrayBuffer(event.target.result), // Serialize ArrayBuffer
          contentType: file.type,
          fileName: file.name
        };
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
    selectedFile.forEach(file => {
      appendMessage(` ${file.fileName}`, "File send", true, "SENT");
    });
    fileList.innerHTML = '';
    selectedFile = []
  }


  function appendMessage(message, from, save, action) {
    // ACTION can be one of the following SENT, RECEIVED, CONNECTION_ESTABLISHED
    const messageElement = document.createElement("div");
    messageElement.innerHTML = from ? `<strong>${from} :</strong><br>${message}` : message;

    let className = '';
    switch (action) {
      case 'SENT': {
        className = 'sent';
        break;
      }

      case 'RECEIVED': {
        className = 'received';
        break;
      }

      case 'CONNECTION_ESTABLISHED': {
        className = 'connection-established';
        break;
      }

      case 'CONNECTION_END': {
        className = 'connection-end';
        break;
      }
    }

    if (className) {
      messageElement.classList.add(className);
    }
    messageElement.classList.add('message');
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;

    if (save) {
      // Save the message in localStorage
      const savedMessages = JSON.parse(localStorage.getItem("chatMessages")) || [];
      const saveMessage = { message, from }
      savedMessages.push(saveMessage);
      localStorage.setItem("chatMessages", JSON.stringify(savedMessages));
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

  function generateColor(text) {
    // Convert the text to a hash code
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert the hash code to a hue value
    const hue = Math.abs(hash) % 360;

    // Convert the hue value to a CSS HSL color string
    const color = `hsl(${hue}, 70%, 50%)`;

    return color;
  }


});