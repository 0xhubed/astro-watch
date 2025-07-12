#!/bin/bash

# AstroWatch - Build Script
# This script builds the AstroWatch application for production deployment

echo "🏗️  Building AstroWatch for production..."
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
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies!"
        exit 1
    fi
fi

# Run type checking
echo "🔍 Running type checks..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed! Please fix TypeScript errors before building."
    exit 1
fi

# Run linting (warnings only, don't fail build)
echo "🔧 Running linter..."
npm run lint --silent || echo "⚠️  Linting warnings found (non-blocking)"

# Clean previous build
if [ -d ".next" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf .next
fi

# Build the application
echo "🏗️  Building production bundle..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

# Check build output
if [ ! -d ".next" ]; then
    echo "❌ Build output not found! Build may have failed silently."
    exit 1
fi

echo "================================"
echo "✅ Build completed successfully!"
echo ""
echo "📂 Build output: .next/"
echo "🚀 To start production server: npm start"
echo "📋 To test locally: npm run start"
echo ""
echo "📊 Build statistics:"
du -sh .next/ 2>/dev/null || echo "Could not determine build size"
echo "================================"