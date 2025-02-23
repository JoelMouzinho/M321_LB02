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

    // Bearbeiten- und Löschen-Buttons nur für eigene Nachrichten
    if (isOwnMessage) {
      const buttonContainer = document.createElement("div");
      buttonContainer.classList.add("flex", "gap-2", "mt-2");

      const editButton = document.createElement("button");
      editButton.textContent = "Bearbeiten";
      editButton.classList.add("bg-purple-500", "text-white", "px-2", "py-1", "rounded");
      editButton.addEventListener("click", () => openEditModal(msgId, messageContent));

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Löschen";
      deleteButton.classList.add("bg-red-500", "text-white", "px-2", "py-1", "rounded");
      deleteButton.addEventListener("click", () => openDeleteModal(msgId, messageBox));

      buttonContainer.appendChild(editButton);
      buttonContainer.appendChild(deleteButton);
      messageBox.appendChild(buttonContainer);
    }

    const messagesContainer = document.getElementById("messages");
    messagesContainer.appendChild(messageBox);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // MODALS: Nachricht bearbeiten
  const editModal = document.getElementById("editMessageModal");
  const editInput = document.getElementById("editMessageInput");
  const saveEditButton = document.getElementById("saveEditMessage");
  const cancelEditButton = document.getElementById("cancelEditMessage");

  let currentMessageId = null;
  let currentMessageElement = null;

  const openEditModal = (msgId, messageContent) => {
    editModal.classList.remove("hidden");
    editInput.value = messageContent.textContent;
    currentMessageId = msgId;
    currentMessageElement = messageContent;
  };

  saveEditButton.onclick = () => {
    if (editInput.value.trim() !== "") {
      socket.send(JSON.stringify({
        type: "edit",
        messageId: currentMessageId,
        newText: editInput.value.trim()
      }));
      currentMessageElement.textContent = editInput.value.trim();
      editModal.classList.add("hidden");
    }
  };

  cancelEditButton.onclick = () => editModal.classList.add("hidden");

  // MODALS: Nachricht löschen
  const deleteModal = document.getElementById("deleteMessageModal");
  const confirmDeleteButton = document.getElementById("confirmDeleteMessage");
  const cancelDeleteButton = document.getElementById("cancelDeleteMessage");

  const openDeleteModal = (msgId, messageBox) => {
    deleteModal.classList.remove("hidden");
    currentMessageId = msgId;
    currentMessageElement = messageBox;
  };

  confirmDeleteButton.onclick = () => {
    socket.send(JSON.stringify({
      type: "delete",
      messageId: currentMessageId
    }));
    currentMessageElement.remove();
    deleteModal.classList.add("hidden");
  };

  cancelDeleteButton.onclick = () => deleteModal.classList.add("hidden");

  // Escape-Taste schließt Modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      editModal.classList.add("hidden");
      deleteModal.classList.add("hidden");
    }
  });

  // Nachrichten vom Server empfangen
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "history") {
      message.messages.forEach(msg => {
        createMessage(msg.id, msg.username, msg.text, msg.timestamp, msg.username === username);
      });
    } else if (message.type === "message") {
      // Verhindere doppelte Anzeige
      if (!document.querySelector(`[data-id='${message.id}']`)) {
        createMessage(message.id, message.username, message.text, message.timestamp, message.username === username);
      }
    } else if (message.type === "edit") {
      const messageBox = document.querySelector(`[data-id='${message.messageId}'] p`);
      if (messageBox) {
        messageBox.textContent = message.newText;
      }
    } else if (message.type === "delete") {
      const messageBox = document.querySelector(`[data-id='${message.messageId}']`);
      if (messageBox) {
        messageBox.remove();
      }
    } else if (message.type === "users") {
      updateOnlineUsers(message.users);
    }
  });

  // Nachricht senden
  const sendButton = document.getElementById("btnSendHello");
  const messageInput = document.querySelector("input[type='text']");

  sendButton.addEventListener("click", () => {
    const messageText = messageInput.value.trim();
    if (messageText !== "") {
      const newMessage = {
        id: Date.now(),  // Temporäre ID für sofortige Anzeige
        username: username,
        text: messageText,
        timestamp: new Date().toISOString()
      };

      // Nachricht direkt im UI anzeigen
      createMessage(newMessage.id, newMessage.username, newMessage.text, newMessage.timestamp, true);

      // Nachricht an den Server senden
      socket.send(JSON.stringify({
        type: "message",
        text: messageText,
        username: username,
        timestamp: newMessage.timestamp
      }));

      // Eingabefeld leeren
      messageInput.value = "";
    }
  });

  messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      sendButton.click();
    }
  });

  // Logout
  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  });

  // Sidebar Toggle
  document.getElementById("toggleUsers").addEventListener("click", () => {
    document.getElementById("onlineUsersSidebar").classList.toggle("translate-x-full");
  });

  // Online-User aktualisieren
  const updateOnlineUsers = (users) => {
    const usersContainer = document.getElementById("onlineUsersList");
    usersContainer.innerHTML = "";
    users.forEach(user => {
      const userElement = document.createElement("div");
      userElement.classList.add("p-2", "text-white", "border-b", "border-gray-600");
      userElement.textContent = user.name;
      usersContainer.appendChild(userElement);
    });
  };
});