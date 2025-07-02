#!/bin/bash

echo "Building Virtue Local Admin Dashboard for Docker..."

# Development build
echo "Building development version..."
docker-compose build virtue-admin

echo "Development build complete!"
echo "To run: docker-compose up virtue-admin"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8001"
echo "  Network:  http://YOUR_IP:5173"
echo ""

# Production build (optional)
read -p "Build production version too? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building production version with Nginx..."
    docker-compose --profile production build virtue-admin-prod
    echo "Production build complete!"
    echo "To run: docker-compose --profile production up virtue-admin-prod"
    echo "Access: http://localhost (or http://YOUR_IP)"
fi

echo "Done!"
