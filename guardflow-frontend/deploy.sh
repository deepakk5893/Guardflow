#!/bin/bash
# Guardflow Frontend Production Deployment Script

set -e  # Exit on any error

echo "🚀 Starting Guardflow Frontend Deployment..."

# Configuration
APP_NAME="guardflow-frontend"

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

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found! Are you in the correct directory?"
    exit 1
fi

# Pull latest code (if this is a git repository)
if [ -d ".git" ]; then
    print_status "Pulling latest code..."
    git pull origin main || git pull origin master || print_warning "Git pull failed - continuing with local code"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.production.yml down --remove-orphans || true

# Build the application
print_status "Building frontend application..."
docker-compose -f docker-compose.production.yml build --no-cache frontend

# Start the services
print_status "Starting frontend service..."
docker-compose -f docker-compose.production.yml up -d

# Wait for service to be ready
print_status "Waiting for frontend to start..."
sleep 15

# Check service health
print_status "Checking frontend health..."

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
timeout 60 bash -c 'until curl -f http://localhost:3000/health > /dev/null 2>&1; do sleep 3; done'

# Verify deployment
print_status "Verifying deployment..."

# Check if container is running
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    print_error "Frontend service failed to start!"
    docker-compose -f docker-compose.production.yml logs --tail=20
    exit 1
fi

# Test frontend endpoint
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "Frontend health check passed"
else
    print_error "Frontend health check failed"
    exit 1
fi

# Clean up old images
print_status "Cleaning up old Docker images..."
docker image prune -f

# Show final status
print_status "Frontend deployment completed successfully! 🎉"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "🔗 Service URLs:"
echo "   Frontend App: http://localhost:3000"
echo "   Health Check: http://localhost:3000/health"

echo ""
echo "📝 Next Steps:"
echo "   1. Test your frontend application"
echo "   2. Monitor logs: docker-compose -f docker-compose.production.yml logs -f"
echo "   3. Configure reverse proxy if needed"
echo "   4. Set up SSL certificates if deploying to production server"

print_status "Frontend deployment completed successfully!"