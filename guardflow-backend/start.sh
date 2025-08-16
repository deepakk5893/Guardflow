#!/bin/bash
set -e

echo "========================================="
echo "🚀 Starting Guardflow Backend"
echo "========================================="

echo "📊 Database Migration Check..."
echo "Running: alembic upgrade head"

# Run database migrations
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

echo "🔥 Starting Gunicorn server..."
echo "Workers: 4"
echo "Host: 0.0.0.0:8000"
echo "========================================="

# Start the application
exec gunicorn app.main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --timeout 120 \
    --keepalive 5