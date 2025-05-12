const WebSocket = require('ws');

class WebSocketHandler {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected to WebSocket');
      
      // Send a welcome message
      ws.send(JSON.stringify({ 
        type: 'connection', 
        message: 'Connected to WebSocket server' 
      }));
      
      // Handle messages from clients
      ws.on('message', (message) => {
        console.log('Received message:', message);
        
        try {
          const parsedMessage = JSON.parse(message);
          
          // Handle different message types
          if (parsedMessage.type === 'ping') {
            ws.send(JSON.stringify({ 
              type: 'pong', 
              timestamp: Date.now() 
            }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
      });
    });
  }

  // Method to get all connected clients
  getClients() {
    return this.wss.clients;
  }
}

module.exports = WebSocketHandler; 