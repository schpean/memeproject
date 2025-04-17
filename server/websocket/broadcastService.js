const WebSocket = require('ws');
const updatesQueue = require('./updatesQueue');

class BroadcastService {
  constructor() {
    this.websocketHandler = null;
  }

  setWebSocketHandler(handler) {
    this.websocketHandler = handler;
  }

  broadcast(type, data) {
    if (!this.websocketHandler) {
      console.error('WebSocket handler not initialized');
      return;
    }

    const message = JSON.stringify({ type, data });
    
    // Broadcast to all connected WebSocket clients
    this.websocketHandler.getClients().forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
    // Store the message in the updates queue for polling clients
    updatesQueue.add({ type, data });
  }

  // Method for HTTP polling fallback
  getUpdatesSince(timestamp) {
    return {
      updates: updatesQueue.getUpdatesSince(timestamp),
      timestamp: Date.now(),
      message: 'Using HTTP polling fallback instead of WebSockets'
    };
  }
}

module.exports = new BroadcastService(); 