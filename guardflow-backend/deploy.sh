#!/bin/bash
# Guardflow Backend Production Deployment Script

set -e  # Exit on any error

echo "🚀 Starting Guardflow Backend Deployment..."

# Configuration
APP_NAME="guardflow-backend"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_warning "Copy .env.example to .env.production and update with production values"
    exit 1
fi

# Create necessary directories
mkdir -p "$BACKUP_DIR" "$LOG_DIR"
print_status "Created backup and log directories"

# Check if database is already running
if docker ps | grep -q guardflow_postgres_prod; then
    print_warning "Database is already running. Creating backup before deployment..."
    
    # Create backup with timestamp
    BACKUP_FILE="$BACKUP_DIR/guardflow_backup_$(date +%Y%m%d_%H%M%S).sql"
    docker exec guardflow_postgres_prod pg_dump -U $(grep POSTGRES_USER .env.production | cut -d '=' -f2) guardflow_prod > "$BACKUP_FILE" 2>/dev/null || true
    
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        print_status "Database backup created: $BACKUP_FILE"
    else
        print_warning "Backup creation failed or database is empty"
        rm -f "$BACKUP_FILE"
    fi
fi

# Pull latest code (if this is a git repository)
if [ -d ".git" ]; then
    print_status "Pulling latest code..."
    git pull origin main || git pull origin master || print_warning "Git pull failed - continuing with local code"
fi

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.production.yml down --remove-orphans
docker-compose -f docker-compose.production.yml pull postgres redis
docker-compose -f docker-compose.production.yml build --no-cache backend celery
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to start..."
sleep 10

# Check service health
print_status "Checking service health..."

# Wait for database
echo "Waiting for database..."
timeout 60 bash -c 'until docker exec guardflow_postgres_prod pg_isready -U $(grep POSTGRES_USER .env.production | cut -d "=" -f2) > /dev/null 2>&1; do sleep 2; done'

# Wait for Redis
echo "Waiting for Redis..."
timeout 30 bash -c 'until docker exec guardflow_redis_prod redis-cli ping > /dev/null 2>&1; do sleep 2; done'

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.production.yml exec -T backend alembic upgrade head

# Wait for backend to be healthy
echo "Waiting for backend to be ready..."
timeout 120 bash -c 'until curl -f http://localhost:8000/health > /dev/null 2>&1; do sleep 5; done'

# Verify deployment
print_status "Verifying deployment..."

# Check if all containers are running
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    print_error "Some services failed to start!"
    docker-compose -f docker-compose.production.yml logs --tail=20
    exit 1
fi

# Test API endpoints
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "Backend health check passed"
else
    print_error "Backend health check failed"
    exit 1
fi

# Check database connectivity
if docker-compose -f docker-compose.production.yml exec -T backend python -c "from app.database import engine; engine.execute('SELECT 1')" > /dev/null 2>&1; then
    print_status "Database connectivity verified"
else
    print_error "Database connectivity check failed"
    exit 1
fi

# Clean up old images
print_status "Cleaning up old Docker images..."
docker image prune -f

# Show final status
print_status "Deployment completed successfully! 🎉"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "🔗 Service URLs:"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/health"

echo ""
echo "📝 Next Steps:"
echo "   1. Test your API endpoints"
echo "   2. Monitor logs: docker-compose -f docker-compose.production.yml logs -f"
echo "   3. Set up SSL certificates if deploying to production server"

print_status "Backend deployment completed successfully!"