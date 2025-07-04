#!/bin/bash

# AstroWatch - Stop Script
# This script stops all running Next.js processes for the AstroWatch application

echo "🛑 Stopping AstroWatch..."
echo "================================"

# Find and kill Next.js processes
NEXT_PIDS=$(pgrep -f "next dev\|next start")

if [ -z "$NEXT_PIDS" ]; then
    echo "✅ No running AstroWatch processes found."
else
    echo "🔍 Found running processes: $NEXT_PIDS"
    
    # Kill the processes
    for PID in $NEXT_PIDS; do
        echo "🛑 Stopping process $PID..."
        kill $PID
    done
    
    # Wait a moment and check if processes are still running
    sleep 2
    
    REMAINING_PIDS=$(pgrep -f "next dev\|next start")
    if [ -z "$REMAINING_PIDS" ]; then
        echo "✅ All AstroWatch processes stopped successfully."
    else
        echo "⚠️  Some processes are still running. Force killing..."
        for PID in $REMAINING_PIDS; do
            echo "💀 Force killing process $PID..."
            kill -9 $PID
        done
        echo "✅ All processes stopped."
    fi
fi

# Also kill any node processes that might be related
NODE_PIDS=$(pgrep -f "node.*3000\|node.*next")
if [ ! -z "$NODE_PIDS" ]; then
    echo "🔍 Found additional Node.js processes on port 3000: $NODE_PIDS"
    for PID in $NODE_PIDS; do
        echo "🛑 Stopping Node.js process $PID..."
        kill $PID
    done
fi

echo "================================"
echo "🏁 AstroWatch stopped."