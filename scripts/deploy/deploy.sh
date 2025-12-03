#!/bin/bash

# EdgeTerminal - Deployment Script
# Deploys the unified trading intelligence platform to Fly.io

set -e

echo "🚀 Deploying EdgeTerminal to Fly.io"
echo "===================================="

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Run:"
    echo "fly auth login"
    exit 1
fi

echo "✅ Fly CLI ready"

# Build the application
echo ""
echo "🔨 Building application..."
bun run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Deploy to Fly.io
echo ""
echo "🚀 Deploying to Fly.io..."
fly deploy

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "🎉 Deployment successful!"
echo ""
echo "🌐 Your app is live at:"
fly open --url
echo ""
echo "📊 Check status:"
echo "fly status"
echo ""
echo "📝 View logs:"
echo "fly logs"
echo ""
echo "🔧 Scale if needed:"
echo "fly scale count 2"
echo ""
echo "💰 Check costs:"
echo "fly dashboard"
echo ""
echo "🎯 Ready to launch on Twitter!"
echo "Run: ./launch-twitter.sh"