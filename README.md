# LocalChat & File Share Web Extension

LocalChat & File Share is a web extension that enables chatting within local networks using WebSockets and facilitates file sharing. It also provides background notifications for received messages.

## Features

- **Local Network Chatting**: Communicate with others within your local network seamlessly.
- **File Sharing**: Share files and documents easily with other users on the same network.
- **Background Notifications**: Receive notifications even when the browser is not in focus.
- **Secure Communication**: All communications are encrypted to ensure privacy and security.

## Installation

1. Clone or download the repository to your local machine.
2. clone server code from [repo](https://github.com/Suraj-AM/lan_chat_server).
3. deployed server and host it in local network add its local ip address at `background.js` file at `line no 6` and save it.   
4. Open your web browser (supported browsers: Chrome, Firefox, etc.).
5. Navigate to `chrome://extensions/` (for Chrome) or `about:addons` (for Firefox).
6. Enable "Developer mode".
7. Click on "Load unpacked" or "Load temporary add-on".
8. Select the directory where you cloned/downloaded the repository.

## Usage

1. Once installed, the extension icon should appear in your browser's toolbar.
2. Click on the extension icon to open the LocalChat & File Share interface.
3. Start chatting by entering your name and connecting to the local network.
4. Use the chat interface to send and receive messages.
5. To share files, simply drag and drop them into the chat interface.
6. Receive background notifications for new messages even when the browser is minimized or inactive.

## Configuration

- **Notification Settings**: Customize notification preferences in the extension settings.
- **Network Configuration**: Modify network settings if needed to ensure proper communication within your local network.
- **server Configuration**: download server code from [repo](https://github.com/Suraj-AM/lan_chat_server).

## Troubleshooting

If you encounter any issues or have questions, please check the following:

- Ensure that your browser supports the extension and is up to date.
- Verify that your device is connected to the local network.
- Check firewall or security settings that may block WebSocket connections.
- If encountering bugs or errors, please report them by opening an issue on this repository.

## Contributing

Contributions are welcome! If you'd like to contribute to the development of this extension, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/improvement`)
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature/improvement`)
6. Create a new Pull Request.

## License

This project is not licensed yet
