let socket;
let messageQueue = [];
let isPopupOpen = false;


const serverLink = '192.168.0.163'
const serverPort = '3011'

/**
  * Async for each
  */
const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
};


chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear();
    connectToSocket();
});


chrome.notifications.onClicked.addListener(() => {
    // Send a message to the popup script indicating a notification click
    chrome.runtime.sendMessage({ notificationClicked: true });
});


// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (sender.id === chrome.runtime.id) {
        if (message) {
            if (message.text) {
                saveMessageToStorage(message.text, "YOU");
            }
            if (message.files) {
                let savedMessage = []
                await asyncForEach(message.files, (file) => {

                    const newMessage = { message: file.fileName, from: "YOU" };

                    savedMessage.push(newMessage);

                });

                chrome.storage.local.get("chatMessages", (result) => {
                    const savedMessages = result.chatMessages || [];

                    savedMessages.push(...savedMessage);

                    chrome.storage.local.set({ "chatMessages": savedMessages });
                });
            }
            sendMessage(message);
        }
    }
});

// Listen for popup open and close events
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "messageBox") {
        port.onDisconnect.addListener(() => {
            isPopupOpen = false;
        });
        isPopupOpen = true;
    }
});

function sendMessageToPopup(message) {
    chrome.runtime.sendMessage(message);
}

function showNotification(from) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: 'New Message Received',
        message: `message received from ${from}`
    });
}


function connectToSocket() {
    try {
        socket = new WebSocket(`ws://${serverLink}:${serverPort}`);
        socket.onopen = function (event) {
            const dateString = `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}`;
            saveMessageToStorage(`Connected to Server: ${serverLink} At ${dateString}`, "CONNECTION_ESTABLISHED");
            sendQueuedMessages(); // Send any queued messages after connection is established
        };

        socket.onmessage = function (event) {
            const parsedEvent = JSON.parse(event.data)
            // Show notification only if popup is closed
            saveMessageToStorage(parsedEvent.text, parsedEvent.from);
            if (isPopupOpen) {
                sendMessageToPopup(event.data);
            } else {
                showNotification(parsedEvent.from);
            }
        };

        socket.onerror = function (error) {
            if (isPopupOpen) {
                sendMessageToPopup(`WebSocket error:\n${JSON.stringify(error, 0, 2)}`);
            }
        };

        socket.onclose = function (event) {
            const dateString = `${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}`;

            if (isPopupOpen) {
                sendMessageToPopup(`Connection failed to Server: ${serverLink} At ${dateString}`, "CONNECTION_END");
            }
            saveMessageToStorage(`Connection failed to Server: ${serverLink} At ${dateString}`, "CONNECTION_END");

            // Reconnect
            setTimeout(connectToSocket, 4000);
        };
    } catch (error) {
        console.log("error ==>", error);
    }
}

function sendMessage(message) {
    if (socket) {
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
                console.error("Error sending message:", err);
                sendMessageToPopup(`Error sending message: ${message}`, 'CONNECTION_END');
                messageQueue.push(message);
            }
        } else {
            // If the WebSocket is closed, reconnect and add the message to the queue
            connectToSocket(); // Reconnect to the WebSocket
            messageQueue.push(message);
        }
    }
}

function sendQueuedMessages() {
    // Send all queued messages
    while (messageQueue.length > 0) {
        try {
            const message = messageQueue.shift();
            const stringifiedData = JSON.stringify(message);
            socket.send(stringifiedData);
        } catch (err) {
            console.error("Error sending message:", err);
            sendMessageToPopup(`Error sending message: ${message}`, 'CONNECTION_END');
            messageQueue.push(message);
        }
    }
}

function saveMessageToStorage(message, from) {
    chrome.storage.local.get("chatMessages", (result) => {
        const savedMessages = result.chatMessages || [];

        const newMessage = { message, from };

        savedMessages.push(newMessage);

        chrome.storage.local.set({ "chatMessages": savedMessages }, () => {
        });
    });
}

