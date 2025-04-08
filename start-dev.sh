#!/bin/bash

echo "==============================================="
echo "    Meme Website Development Environment"
echo "==============================================="
echo
echo "This script will:"
echo "1. Start the server on port 1337"
echo "2. Start the client on port 1338"
echo
echo "Alternative options:"
echo "- npm run start-unix: Just start the React app on port 1338"
echo "- npm run server: Just start the server on port 1337"
echo "- npm run dev-unix: Start both using concurrently (single terminal)"
echo

# Define port for React app
export PORT=1338

# Get directory of script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Start the server in a new terminal
gnome-terminal -- bash -c "npm run server; exec bash" || \
xterm -e "npm run server; exec bash" || \
konsole -e "npm run server; exec bash" || \
echo "Could not open a new terminal window. Starting server in background."
echo "Server started on port 1337..."
sleep 3

# Start the React app in a new terminal
gnome-terminal -- bash -c "npm run start-unix; exec bash" || \
xterm -e "npm run start-unix; exec bash" || \
konsole -e "npm run start-unix; exec bash" || \
echo "Could not open a new terminal window. Starting client in background."
echo "React app started on port 1338..."
echo

echo "==============================================="
echo "    Development environment is now running!"
echo "==============================================="
echo "- Server: http://localhost:1337"
echo "- Client: http://localhost:1338"
echo
echo "Press Ctrl+C to close this window (servers will continue running)."
read -p "Press Enter to exit..." 