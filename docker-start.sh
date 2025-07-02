#!/bin/sh

# Start Flask backend in background
echo "Starting Flask backend..."
cd /app/backend
export PYTHONPATH=/usr/local/lib/python3.11/site-packages:$PYTHONPATH
python3 app.py &

# Wait for backend to start
sleep 5

# Start Nginx in foreground
echo "Starting Nginx..."
nginx -g 'daemon off;'
