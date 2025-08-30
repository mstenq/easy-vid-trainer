#!/bin/bash

# Easy Vid Trainer - Test Runner Script
# This script provides convenient commands for running different types of tests

set -e

show_help() {
    echo "Easy Vid Trainer Test Runner"
    echo ""
    echo "Usage: ./test.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup      Install dependencies and browsers"
    echo "  run        Run all tests"
    echo "  ui         Run tests in interactive UI mode"
    echo "  debug      Run tests in debug mode"
    echo "  single     Run a single test by name pattern"
    echo "  api        Run only API tests"
    echo "  e2e        Run only E2E UI tests"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./test.sh setup"
    echo "  ./test.sh run"
    echo "  ./test.sh single 'dataset creation'"
    echo "  ./test.sh ui"
}

case "${1:-help}" in
    "setup")
        echo "🔧 Setting up test environment..."
        bun install
        bunx playwright install
        echo "✅ Setup complete!"
        ;;
    "run")
        echo "🧪 Running all tests..."
        bun test
        ;;
    "ui")
        echo "🎮 Starting interactive test UI..."
        bun run test:ui
        ;;
    "debug")
        echo "🐛 Starting debug mode..."
        bun run test:debug
        ;;
    "single")
        if [ -z "$2" ]; then
            echo "❌ Please provide a test name pattern"
            echo "Example: ./test.sh single 'dataset creation'"
            exit 1
        fi
        echo "🎯 Running tests matching: $2"
        bunx playwright test --grep "$2"
        ;;
    "api")
        echo "🔌 Running API tests..."
        bunx playwright test --grep "API Integration"
        ;;
    "e2e")
        echo "🌐 Running E2E UI tests..."
        bunx playwright test --grep "Easy Vid Trainer E2E"
        ;;
    "headed")
        echo "👀 Running tests in headed mode..."
        bun run test:headed
        ;;
    "help"|*)
        show_help
        ;;
esac
