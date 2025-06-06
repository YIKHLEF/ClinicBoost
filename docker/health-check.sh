#!/bin/sh
# Health check script for ClinicBoost

# Check if nginx is running
if ! pgrep nginx > /dev/null; then
    echo "Nginx is not running"
    exit 1
fi

# Check if the application responds
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Application health check failed"
    exit 1
fi

echo "Health check passed"
exit 0
