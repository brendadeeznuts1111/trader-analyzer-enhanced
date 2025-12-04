#!/bin/bash
# Deploy Factory Wager Mini App to Cloudflare Pages
# Usage: ./scripts/deploy/deploy-miniapp.sh [staging|production]

set -e

ENV="${1:-staging}"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MINIAPP_DIR="$PROJECT_DIR/miniapp-standalone"

echo "🚀 Deploying Factory Wager Mini App to Cloudflare Pages ($ENV)"

cd "$PROJECT_DIR"

# Check if the miniapp directory exists
if [ ! -d "$MINIAPP_DIR" ]; then
    echo "❌ miniapp-standalone directory not found"
    exit 1
fi

# Create a temp directory for deployment
DEPLOY_DIR=$(mktemp -d)
cp -r "$MINIAPP_DIR"/* "$DEPLOY_DIR/"

# For staging, the mini app auto-detects API URL based on hostname
# For production, we can optionally inject a custom URL
if [ "$ENV" = "production" ]; then
    echo "📝 Production deploy - using default API detection"
else
    echo "📝 Staging deploy - mini app will auto-detect API URL"
fi

# Use deploy dir instead of miniapp dir
MINIAPP_DIR="$DEPLOY_DIR"

# Deploy to Cloudflare Pages
echo "☁️ Deploying to Cloudflare Pages..."
if [ "$ENV" = "production" ]; then
    bunx wrangler pages deploy "$MINIAPP_DIR" \
        --project-name=factory-wager-miniapp \
        --branch=main \
        --commit-dirty=true
else
    bunx wrangler pages deploy "$MINIAPP_DIR" \
        --project-name=factory-wager-miniapp \
        --branch=staging \
        --commit-dirty=true
fi

# Cleanup temp directory
rm -rf "$DEPLOY_DIR"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Mini App URLs:"
if [ "$ENV" = "production" ]; then
    echo "   Production: https://app.factory-wager.com"
    echo "   Fallback:   https://factory-wager-miniapp.pages.dev"
else
    echo "   Staging: https://staging.factory-wager-miniapp.pages.dev"
fi
echo ""
echo "🔧 Custom domain setup (factory-wager.com DNS):"
echo "   Add CNAME record:"
echo "   Name: app"
echo "   Target: factory-wager-miniapp.pages.dev"
echo "   Proxy: ON (orange cloud)"
echo ""
echo "📲 To register with Telegram BotFather:"
echo "   1. Message @BotFather"
echo "   2. /mybots > Your Bot > Bot Settings > Menu Button"
echo "   3. Set URL: https://app.factory-wager.com"
