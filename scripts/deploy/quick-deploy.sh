#!/bin/bash

# Trader Analyzer - Quick Create/Destroy Script
# Usage: ./scripts/deploy/quick-deploy.sh [create|destroy|status]

set -e

PROJECT_NAME="trader-analyzer"
WORKER_NAME="trader-analyzer-markets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v bun &> /dev/null; then
        log_error "Bun is not installed. Please install Bun first: https://bun.com"
        exit 1
    fi

    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler is not installed. Please install: bun add wrangler"
        exit 1
    fi

    log_success "Dependencies OK"
}

create_app() {
    log_info "Creating Trader Analyzer application..."

    # Install dependencies
    log_info "Installing dependencies..."
    bun install

    # Run tests
    log_info "Running tests..."
    bun test

    # Build the application
    log_info "Building application..."
    bun run build

    # Deploy to staging
    log_info "Deploying to Cloudflare Workers (staging)..."
    bunx wrangler deploy --config scripts/deploy/markets-wrangler.toml --env staging

    log_success "Application created and deployed!"
    log_info "Staging URL: https://trader-analyzer-markets-staging.utahj4754.workers.dev"
}

destroy_app() {
    log_warning "Destroying Trader Analyzer application..."

    # Confirm destruction
    read -p "Are you sure you want to destroy the application? This will delete all deployments. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Destruction cancelled"
        exit 0
    fi

    # Delete Workers deployments
    log_info "Deleting Cloudflare Workers deployments..."
    bunx wrangler delete --name trader-analyzer-markets-staging 2>/dev/null || true
    bunx wrangler delete --name trader-analyzer-markets 2>/dev/null || true

    # Clean local build artifacts
    log_info "Cleaning local build artifacts..."
    rm -rf .next dist-worker/ *.log

    log_success "Application destroyed!"
}

show_status() {
    log_info "Trader Analyzer Status"
    echo

    # Check if dependencies are installed
    if command -v bun &> /dev/null && command -v wrangler &> /dev/null; then
        log_success "Dependencies: Installed"
    else
        log_error "Dependencies: Missing"
    fi

    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        log_success "Node modules: Installed"
    else
        log_error "Node modules: Not installed"
    fi

    # Check if built
    if [ -d ".next" ]; then
        log_success "Frontend build: Ready"
    else
        log_warning "Frontend build: Not built"
    fi

    # Check Workers deployment
    echo
    log_info "Checking Cloudflare Workers status..."
    bunx wrangler deployments list --name trader-analyzer-markets-staging 2>/dev/null || log_warning "Staging: Not deployed"
    bunx wrangler deployments list --name trader-analyzer-markets 2>/dev/null || log_warning "Production: Not deployed"

    echo
    log_info "Quick commands:"
    echo "  Create app:  $0 create"
    echo "  Destroy app: $0 destroy"
    echo "  Show status: $0 status"
    echo "  Run tests:   bun test"
    echo "  Start dev:   bun run dev:full"
}

# Main script logic
case "${1:-status}" in
    "create")
        check_dependencies
        create_app
        ;;
    "destroy")
        check_dependencies
        destroy_app
        ;;
    "status")
        show_status
        ;;
    *)
        log_error "Usage: $0 [create|destroy|status]"
        exit 1
        ;;
esac