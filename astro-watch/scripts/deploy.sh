#!/bin/bash

# AstroWatch Deployment Script
# Prepares and deploys the application to Vercel

set -e

echo "🚀 Starting AstroWatch deployment preparation..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Check if required environment variables are set
if [ -z "$NASA_API_KEY" ]; then
    echo "⚠️  Warning: NASA_API_KEY environment variable not set."
    echo "   Make sure to set this in your Vercel dashboard or .env.local file."
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type checking
echo "🔍 Running TypeScript type checking..."
npm run typecheck

# Run linting
echo "🔧 Running ESLint..."
npm run lint

# Build the application
echo "🏗️  Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Deployment checklist:"
    echo "   ✅ Dependencies installed"
    echo "   ✅ TypeScript compilation passed"
    echo "   ✅ Linting passed"
    echo "   ✅ Build completed successfully"
    echo ""
    echo "📋 Next steps for Vercel deployment:"
    echo "   1. Install Vercel CLI: npm i -g vercel"
    echo "   2. Login to Vercel: vercel login"
    echo "   3. Deploy: vercel --prod"
    echo ""
    echo "🔑 Environment variables to set in Vercel:"
    echo "   - NASA_API_KEY (required)"
    echo "   - NEXT_PUBLIC_NASA_API_BASE (optional)"
    echo "   - NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING (optional)"
    echo ""
    echo "🌐 Your application will be available at your Vercel domain once deployed!"
else
    echo "❌ Build failed! Please fix the errors above before deploying."
    exit 1
fi