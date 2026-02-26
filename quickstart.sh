#!/bin/bash

# ViralClip Quick Start Script
# Run this to get up and running quickly

echo "🚀 Setting up ViralClip SAAS..."

# Check Node.js
if ! command -v node \u0026> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Python
if ! command -v python3 \u0026> /dev/null && ! command -v python \u0026> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.x first."
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install yt-dlp

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend \u0026\u0026 npm install \u0026\u0026 cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend \u0026\u0026 npm install \u0026\u0026 cd ..

# Create output directories
mkdir -p output temp

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Start backend: cd backend \u0026\u0026 npm start"
echo "  2. Start frontend: cd frontend \u0026\u0026 npm start"
echo "  3. Visit http://localhost:3230"
echo ""
echo "Or run the main app: npm start"
