#!/bin/bash
# 🎯 Tmux Integration Script for Enhanced Bun Development
# 
# This script creates and manages tmux sessions for optimal development workflow
# with the enhanced bunfig configuration.

TMUX_SESSION="bun-dev"
PROJECT_ROOT="$(pwd)"
CONFIG_FILE="$PROJECT_ROOT/bunfig-enhanced.toml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if tmux is installed
check_tmux() {
    if ! command -v tmux &> /dev/null; then
        print_error "tmux is not installed. Please install tmux first:"
        echo "  • macOS: brew install tmux"
        echo "  • Ubuntu: sudo apt-get install tmux"
        echo "  • CentOS: sudo yum install tmux"
        exit 1
    fi
}

# Function to create tmux session
create_session() {
    print_header "Creating Enhanced Bun Development Session"
    
    # Check if session already exists
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        print_warning "Session '$TMUX_SESSION' already exists"
        echo "Choose an option:"
        echo "  1) Attach to existing session"
        echo "  2) Kill existing session and create new one"
        echo "  3) Exit"
        read -p "Choice (1-3): " choice
        
        case $choice in
            1)
                attach_session
                return
                ;;
            2)
                tmux kill-session -t "$TMUX_SESSION"
                print_status "Killed existing session"
                ;;
            3)
                exit 0
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
    fi
    
    # Create new session
    print_status "Creating tmux session: $TMUX_SESSION"
    tmux new-session -d -s "$TMUX_SESSION" -c "$PROJECT_ROOT"
    
    # Set up window layout
    setup_windows
    
    print_status "Session created successfully!"
    echo ""
    echo "Available windows:"
    echo "  0) Main - Development server"
    echo "  1) YAML - Enhanced YAML examples"
    echo "  2) Test - Test runner with coverage"
    echo "  3) Config - Configuration management"
    echo "  4) Monitor - Performance monitoring"
    echo ""
    echo "To attach: tmux attach -t $TMUX_SESSION"
    echo "To kill: tmux kill-session -t $TMUX_SESSION"
}

# Function to set up tmux windows
setup_windows() {
    print_status "Setting up development windows..."
    
    # Window 0: Main development (already exists as first window)
    tmux rename-window -t "$TMUX_SESSION:0" "Main"
    tmux send-keys -t "$TMUX_SESSION:0" "echo '🚀 Main Development Window'" C-m
    tmux send-keys -t "$TMUX_SESSION:0" "echo 'Run: bun --config=bunfig-enhanced.toml run dev'" C-m
    
    # Window 1: YAML Examples
    tmux new-window -t "$TMUX_SESSION" -n "YAML"
    tmux send-keys -t "$TMUX_SESSION:1" "echo '📝 Enhanced YAML Examples'" C-m
    tmux send-keys -t "$TMUX_SESSION:1" "echo 'Run: bun --config=bunfig-enhanced.toml run examples/enhanced-yaml-console.ts'" C-m
    
    # Window 2: Testing
    tmux new-window -t "$TMUX_SESSION" -n "Test"
    tmux send-keys -t "$TMUX_SESSION:2" "echo '🧪 Testing with Coverage'" C-m
    tmux send-keys -t "$TMUX_SESSION:2" "echo 'Run: bun --config=bunfig-enhanced.toml test --coverage'" C-m
    
    # Window 3: Configuration
    tmux new-window -t "$TMUX_SESSION" -n "Config"
    tmux send-keys -t "$TMUX_SESSION:3" "echo '⚙️  Configuration Management'" C-m
    tmux send-keys -t "$TMUX_SESSION:3" "echo 'Edit: $CONFIG_FILE'" C-m
    tmux send-keys -t "$TMUX_SESSION:3" "echo 'Validate: bun config --show --config=bunfig-enhanced.toml'" C-m
    
    # Window 4: Performance Monitor
    tmux new-window -t "$TMUX_SESSION" -n "Monitor"
    tmux send-keys -t "$TMUX_SESSION:4" "echo '📊 Performance Monitoring'" C-m
    tmux send-keys -t "$TMUX_SESSION:4" "echo 'Run: bun --config=bunfig-enhanced.toml run benchmark/nano-benchmark.ts'" C-m
    
    # Return to main window
    tmux select-window -t "$TMUX_SESSION:0"
}

# Function to attach to session
attach_session() {
    print_status "Attaching to session: $TMUX_SESSION"
    tmux attach -t "$TMUX_SESSION"
}

# Function to list sessions
list_sessions() {
    print_header "Tmux Sessions"
    tmux list-sessions 2>/dev/null || print_warning "No tmux sessions found"
}

# Function to kill session
kill_session() {
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        print_status "Killing session: $TMUX_SESSION"
        tmux kill-session -t "$TMUX_SESSION"
        print_status "Session killed successfully"
    else
        print_warning "Session '$TMUX_SESSION' does not exist"
    fi
}

# Function to show session info
show_session_info() {
    print_header "Session Information"
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        echo "Session: $TMUX_SESSION"
        echo "Windows:"
        tmux list-windows -t "$TMUX_SESSION" | while read line; do
            echo "  $line"
        done
        echo ""
        echo "Configuration: $CONFIG_FILE"
        if [ -f "$CONFIG_FILE" ]; then
            echo "Console depth: $(grep -A1 '\[console\]' "$CONFIG_FILE" | tail -1 | cut -d'=' -f2 | tr -d ' ')"
            echo "Environment: $(grep BUN_ENV "$CONFIG_FILE" | cut -d'=' -f2 | tr -d ' ')"
        fi
    else
        print_warning "Session '$TMUX_SESSION' does not exist"
    fi
}

# Function to show help
show_help() {
    print_header "Enhanced Bun Tmux Integration"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  create, c    Create new development session"
    echo "  attach, a    Attach to existing session"
    echo "  list, l      List all tmux sessions"
    echo "  kill, k      Kill development session"
    echo "  info, i      Show session information"
    echo "  help, h      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  TMUX_SESSION    Session name (default: bun-dev)"
    echo "  PROJECT_ROOT    Project directory (default: current directory)"
    echo ""
    echo "Examples:"
    echo "  $0 create           # Create new session"
    echo "  $0 attach           # Attach to session"
    echo "  TMUX_SESSION=myapp $0 create  # Custom session name"
}

# Main script logic
main() {
    # Check dependencies
    check_tmux
    
    # Parse command line arguments
    case "${1:-help}" in
        create|c)
            create_session
            ;;
        attach|a)
            attach_session
            ;;
        list|l)
            list_sessions
            ;;
        kill|k)
            kill_session
            ;;
        info|i)
            show_session_info
            ;;
        help|h|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
