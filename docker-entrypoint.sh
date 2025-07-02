#!/bin/bash

# Start backend in background
echo "Starting Flask backend..."
cd /app/backend
python app.py &

# Wait a moment for backend to start
sleep 3

# Start frontend static server
echo "Starting Frontend static server..."
cd /app/frontend/dist

# Simple Python HTTP server that listens on all interfaces
python3 -m http.server 5173 --bind 0.0.0.0 &

# Keep container running
wait
