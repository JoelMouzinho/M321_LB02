const WebSocket = require("ws");
const { executeSQL } = require('./database');

const clients = [];

/**
 * Initializes the websocket server.
 * @example
 * initializeWebsocketServer(server);
 * @param {Object} server - The http server object.
 * @returns {void}
 */
const initializeWebsocketServer = (server) => {
  const websocketServer = new WebSocket.Server({ server });
  websocketServer.on("connection", onConnection);
};

/**
 * Handles a new websocket connection.
 * @example
 * onConnection(ws);
 * @param {Object} ws - The websocket object.
 * @returns {void}
 */
const onConnection = async (ws) => {
  console.log("New websocket connection");

  // Sende alle bisherigen Nachrichten an den neuen Client
  const messages = await getMessagesFromDB();
  ws.send(JSON.stringify({ type: "history", messages }));

  ws.on("message", (message) => onMessage(ws, message));
};

const saveMessageToDB = async (username, messageText) => {
  try {
    // Hole die Benutzer-ID basierend auf dem Benutzernamen
    const userQuery = "SELECT id FROM users WHERE username = ?";
    const userResult = await executeSQL(userQuery, [username]);

    if (userResult.length === 0) {
      console.log("User not found in database.");
      return;
    }

    const userId = userResult[0].id;

    const insertMessageQuery = "INSERT INTO messages (user_id, message, timestamp) VALUES (?, ?, NOW())";
    const result = await executeSQL(insertMessageQuery, [userId, messageText]);

    console.log("Message saved to DB:", result);
    return {
      id: result.insertId,
      username,
      text: messageText,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Error saving message to DB:", err);
  }
};

const getMessagesFromDB = async () => {
  const query = `
    SELECT m.id, u.username, m.message, m.timestamp 
    FROM messages m 
    JOIN users u ON m.user_id = u.id 
    ORDER BY m.timestamp ASC;
  `;
  try {
    const messages = await executeSQL(query);
    return messages.map(msg => ({
      id: msg.id,
      username: msg.username,
      text: msg.message,
      timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : null,
    }));
  } catch (err) {
    console.error("Error fetching messages from DB:", err);
    return [];
  }
};

const editMessageInDB = async (messageId, newText) => {
  try {
    const updateQuery = "UPDATE messages SET message = ? WHERE id = ?";
    await executeSQL(updateQuery, [newText, messageId]);
    console.log("Message updated in DB:", messageId);
  } catch (err) {
    console.error("Error updating message in DB:", err);
  }
};

const deleteMessageFromDB = async (messageId) => {
  try {
    const deleteQuery = "DELETE FROM messages WHERE id = ?";
    await executeSQL(deleteQuery, [messageId]);
    console.log("Message deleted from DB:", messageId);
  } catch (err) {
    console.error("Error deleting message from DB:", err);
  }
};

const updateUsernameInDB = async (userId, newUsername) => {
  try {
    // Update-Abfrage zum Ändern des Benutzernamens in der Datenbank
    const updateQuery = "UPDATE users SET username = ? WHERE id = ?";
    await executeSQL(updateQuery, [newUsername, userId]);
    console.log("Username updated in DB:", userId);
  } catch (err) {
    console.error("Error updating username in DB:", err);
  }
};

// If a new message is received, the onMessage function is called
/**
 * Handles a new message from a websocket connection.
 * @example
 * onMessage(ws, messageBuffer);
 * @param {Object} ws - The websocket object.
 * @param {Buffer} messageBuffer - The message buffer. IMPORTANT: Needs to be converted to a string or JSON object first.
 */
const onMessage = async (ws, messageBuffer) => {
  const messageString = messageBuffer.toString();
  const message = JSON.parse(messageString);
  console.log("Received message: " + messageString);
  // The message type is checked and the appropriate action is taken
  switch (message.type) {
    case "user": {
      clients.push({ ws, user: message.user });
      const usersMessage = {
        type: "users",
        users: clients.map((client) => client.user),
      };
      clients.forEach((client) => {
        client.ws.send(JSON.stringify(usersMessage));
      });
      ws.on("close", () => onDisconnect(ws));
      break;
    }
    case "message": {
      const savedMessage = await saveMessageToDB(message.username, message.text);

      // Alle Clients benachrichtigen
      const messageToSend = {
        type: "message",
        username: savedMessage.username,
        text: savedMessage.text,
        timestamp: savedMessage.timestamp,
      };

      clients.forEach((client) => {
        client.ws.send(JSON.stringify(messageToSend));
      });
      break;
    }
    case "delete": {
      await deleteMessageFromDB(message.messageId);

      // Alle Clients über die Löschung informieren
      const deleteMessage = {
        type: "delete",
        messageId: message.messageId
      };
      clients.forEach((client) => {
        client.ws.send(JSON.stringify(deleteMessage));
      });
      break;
    }
    case "edit": {
      await editMessageInDB(message.messageId, message.newText);

      const editMessage = {
        type: "edit",
        messageId: message.messageId,
        newText: message.newText,
      };
      clients.forEach((client) => {
        client.ws.send(JSON.stringify(editMessage));
      });
      break;
    }
    case "updateUsername": {
      const client = clients.find(client => client.ws === ws);
      if (client) {
        await updateUsernameInDB(client.user.id, message.newUsername);

        client.user.name = message.newUsername;

        const usersMessage = {
          type: "users",
          users: clients.map((client) => client.user),
        };
        clients.forEach((client) => {
          client.ws.send(JSON.stringify(usersMessage));
        });
      }
      break;
    }
    default: {
      console.log("Unknown message type: " + message.type);
    }
  }
};

/**
 * Handles a websocket disconnect. All other clients are notified about the disconnect.
 * @example
 * onDisconnect(ws);
 * @param {Object} ws - The websocket object.
 * @returns {void}
 */
const onDisconnect = (ws) => {
  const index = clients.findIndex((client) => client.ws === ws);
  clients.splice(index, 1);
  const usersMessage = {
    type: "users",
    users: clients.map((client) => client.user),
  };
  clients.forEach((client) => {
    client.ws.send(JSON.stringify(usersMessage));
  });
};

module.exports = { initializeWebsocketServer };
