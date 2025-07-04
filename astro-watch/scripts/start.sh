#!/bin/bash

# AstroWatch - Start Script
# This script starts the Next.js development server for the AstroWatch application

echo "🚀 Starting AstroWatch..."
echo "================================"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local file with your NASA API key."
    echo "See NASA_API_SETUP.md for instructions."
    exit 1
fi

# Check if NASA API key is set
if ! grep -q "NASA_API_KEY=" .env.local; then
    echo "❌ Error: NASA_API_KEY not found in .env.local!"
    echo "Please add your NASA API key to .env.local file."
    echo "See NASA_API_SETUP.md for instructions."
    exit 1
fi

# Check if NASA API key is not the placeholder
if grep -q "NASA_API_KEY=your_nasa_api_key_here" .env.local; then
    echo "❌ Error: NASA_API_KEY is still set to placeholder value!"
    echo "Please replace 'your_nasa_api_key_here' with your actual NASA API key."
    echo "See NASA_API_SETUP.md for instructions."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🌟 Starting development server..."
echo "🌍 The application will be available at: http://localhost:3000"
echo "🔄 The server will auto-reload when you make changes"
echo "🛑 Press Ctrl+C to stop the server"
echo "================================"

npm run dev