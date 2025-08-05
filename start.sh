#!/bin/bash

# P2P Backend Startup Script

echo "🚀 Starting P2P Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before starting the server"
    echo "   Required: JWT_SECRET, MONGODB_URI"
    exit 1
fi

# Check if MongoDB is running (optional check)
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found. Please ensure MongoDB is installed and running."
    echo "   You can install MongoDB from: https://docs.mongodb.com/manual/installation/"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🔥 Starting development server..."
npm run dev 