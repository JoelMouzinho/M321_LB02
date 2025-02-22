document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
    return;
  }

  // Token decodieren, um den Benutzernamen zu erhalten
  const decodedToken = JSON.parse(atob(token.split('.')[1]));
  const username = decodedToken.username;

  // Benutzernamen auf der Webseite anzeigen
  const showUserElement = document.getElementById("showuser");
  if (showUserElement) {
    showUserElement.textContent = username;
  }

  const socket = new WebSocket("ws://localhost:3000");

  // WebSocket-Verbindung öffnen
  socket.addEventListener("open", () => {
    console.log("WebSocket connected.");
    socket.send(JSON.stringify({ type: "user", user: { id: decodedToken.userId, name: username } }));
  });

  // Funktion zur Anzeige von Nachrichten im Chat
  const createMessage = (msgId, username, messageText, timestamp = null, isOwnMessage = false) => {
    const messageBox = document.createElement("div");
    messageBox.classList.add("bg-gray-600", "p-4", "rounded-lg", "shadow-md", "space-y-2", "mb-2");
    messageBox.setAttribute("data-id", msgId);

    const senderInfo = document.createElement("div");
    senderInfo.classList.add("flex", "justify-between", "items-center");

    const senderName = document.createElement("span");
    senderName.classList.add("font-bold", "text-purple-400");
    senderName.textContent = username;

    const timeElement = document.createElement("span");
    timeElement.classList.add("text-gray-400", "text-sm");
    if (timestamp) {
      const date = new Date(timestamp);
      timeElement.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }

    senderInfo.appendChild(senderName);
    senderInfo.appendChild(timeElement);

    const messageContent = document.createElement("p");
    messageContent.classList.add("text-gray-200");
    messageContent.textContent = messageText;

    messageBox.appendChild(senderInfo);
    messageBox.appendChild(messageContent);

    // Bearbeiten-Button nur für eigene Nachrichten
    if (isOwnMessage) {
      const editButton = document.createElement("button");
      editButton.textContent = "Bearbeiten";
      editButton.classList.add("bg-blue-500", "text-white", "px-2", "py-1", "rounded", "mt-2");
      editButton.addEventListener("click", () => editMessage(msgId, messageContent));
      messageBox.appendChild(editButton);
    }

    const messagesContainer = document.getElementById("messages");
    messagesContainer.appendChild(messageBox);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Nachricht bearbeiten
  const editMessage = (msgId, messageElement) => {
    const oldText = messageElement.textContent;
    const newText = prompt("Bearbeite deine Nachricht:", oldText);

    if (newText && newText.trim() !== "" && newText !== oldText) {
      socket.send(JSON.stringify({
        type: "edit",
        messageId: msgId,
        newText: newText
      }));

      // UI direkt aktualisieren
      messageElement.textContent = newText;
    }
  };

  // Nachrichten vom Server empfangen
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "history") {
      message.messages.forEach(msg => {
        createMessage(msg.id, msg.username, msg.text, msg.timestamp, msg.username === username);
      });
    } else if (message.type === "message") {
      createMessage(message.id, message.username, message.text, message.timestamp, message.username === username);
    } else if (message.type === "edit") {
      const messageBox = document.querySelector(`[data-id='${message.messageId}'] p`);
      if (messageBox) {
        messageBox.textContent = message.newText;
      }
    }
  });

  // Fehlerbehandlung für WebSocket
  socket.addEventListener("close", () => console.log("WebSocket closed."));
  socket.addEventListener("error", (event) => console.error("WebSocket error:", event));

  // Nachricht senden
  const sendButton = document.getElementById("btnSendHello");
  const messageInput = document.querySelector("input[type='text']");
  const logoutButton = document.getElementById("btnLogout");

  sendButton.addEventListener("click", () => {
    const messageText = messageInput.value.trim();
    if (messageText !== "") {
      socket.send(JSON.stringify({
        type: "message",
        text: messageText,
        username: username,
        timestamp: new Date().toISOString()
      }));
      messageInput.value = "";
    }
  });

  messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      sendButton.click();
    }
  });

  // Logout-Funktion
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  });

  document.getElementById("toggleUsers").addEventListener("click", function () {
    const sidebar = document.getElementById("onlineUsersSidebar");
    if (sidebar.classList.contains("translate-x-full")) {
        sidebar.classList.remove("translate-x-full");
    } else {
        sidebar.classList.add("translate-x-full");
    }
});
});