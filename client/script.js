document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
  } else {
    // Wenn ein Token vorhanden ist, Benutzername extrahieren und anzeigen
    const decodedToken = JSON.parse(atob(token.split('.')[1])); // Extrahiere Payload und dekodiere
    const username = decodedToken.username; // Holen des Benutzernamens aus dem Token

    // Zeige den Benutzernamen auf der Seite an
    const showUserElement = document.getElementById("showuser");
    if (showUserElement) {
      showUserElement.textContent = `${username}`;
    }

    const socket = new WebSocket("ws://localhost:3000");

    // WebSocket open Event
    socket.addEventListener("open", (event) => {
      console.log("WebSocket connected.");

      // Benutzer aus dem Token verwenden
      const user = { id: decodedToken.userId, name: username };

      // Sende die Nutzerdaten an den Server
      const message = {
        type: "user",
        user,
      };
      socket.send(JSON.stringify(message));
    });

    const createMessage = (message) => {
      const p = document.createElement("p");
      p.textContent = message;
      document.getElementById("messages").appendChild(p);
    };

    // Nachrichten von Server empfangen
    socket.addEventListener("message", (event) => {
      console.log(`Received message: ${event.data}`);
      createMessage(event.data);
    });

    // WebSocket schließt
    socket.addEventListener("close", (event) => {
      console.log("WebSocket closed.");
    });

    // WebSocket Fehler
    socket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
    });

    // Senden der Nachricht
    const sendButton = document.getElementById("btnSendHello");
    const messageInput = document.querySelector("input[type='text']");
    const logoutButton = document.getElementById("btnLogout");

    sendButton.addEventListener("click", () => {
      const messageText = messageInput.value.trim();

      if (messageText !== "") {
        const message = {
          type: "message",
          text: messageText,
        };

        socket.send(JSON.stringify(message));
        messageInput.value = "";
      }
    });

    messageInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        sendButton.click();
      }
    });

    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    });
  }
});