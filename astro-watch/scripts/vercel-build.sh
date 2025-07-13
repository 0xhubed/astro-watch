#!/bin/bash

# Vercel Build Script for AstroWatch
# This script runs during Vercel's build process

set -e

echo "🌌 Building AstroWatch for production..."

# Check Node.js version
node_version=$(node -v)
echo "📊 Node.js version: $node_version"

# Install dependencies with exact versions for reproducible builds
echo "📦 Installing dependencies..."
npm ci --frozen-lockfile

# Create public/models directory if it doesn't exist
echo "📁 Setting up model directory..."
mkdir -p public/models/asteroid-risk-model

# Run TypeScript compilation check
echo "🔍 Type checking..."
npx tsc --noEmit

# Build the Next.js application
echo "🏗️  Building Next.js application..."
npm run build

# Verify critical files exist
echo "✅ Verifying build outputs..."
if [ ! -d ".next" ]; then
    echo "❌ Error: .next directory not found after build"
    exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Error: BUILD_ID not found"
    exit 1
fi

echo "🎉 Build completed successfully!"
echo "📊 Build statistics:"
du -sh .next 2>/dev/null || echo "Build size: Unknown"
echo "🚀 Ready for deployment!"