#!/bin/bash
# Guardflow Backend Health Check and Monitoring Script

set -e

echo "🏥 Guardflow Backend Health Check"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Configuration
BACKEND_URL="http://localhost:8000"
HEALTH_ENDPOINT="$BACKEND_URL/health"
API_ENDPOINT="$BACKEND_URL/api/v1"

# Initialize counters
CHECKS_PASSED=0
CHECKS_FAILED=0
TOTAL_CHECKS=0

# Function to run a check
run_check() {
    local check_name="$1"
    local check_command="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $check_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        return 1
    fi
}

# Function to get container status
get_container_status() {
    local container_name="$1"
    local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")
    echo "$status"
}

# Function to check container health
check_container_health() {
    local container_name="$1"
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_healthcheck")
    echo "$health"
}

echo "==========================================="
echo "🔍 Container Status Check"
echo "==========================================="

# Check Docker containers
containers=("guardflow_postgres_prod" "guardflow_redis_prod" "guardflow_backend_prod" "guardflow_celery_prod")

for container in "${containers[@]}"; do
    status=$(get_container_status "$container")
    health=$(check_container_health "$container")
    
    echo -n "$container: "
    case "$status" in
        "running")
            if [ "$health" = "healthy" ] || [ "$health" = "no_healthcheck" ]; then
                echo -e "${GREEN}Running (Healthy)${NC}"
            else
                echo -e "${YELLOW}Running ($health)${NC}"
            fi
            ;;
        "exited")
            echo -e "${RED}Stopped${NC}"
            ;;
        "not_found")
            echo -e "${RED}Not Found${NC}"
            ;;
        *)
            echo -e "${YELLOW}$status${NC}"
            ;;
    esac
done

echo ""
echo "==========================================="
echo "🔍 Service Health Checks"
echo "==========================================="

# Database connectivity
run_check "Database Connection" "docker exec guardflow_postgres_prod pg_isready -U \$(grep POSTGRES_USER .env.production | cut -d '=' -f2)"

# Redis connectivity  
run_check "Redis Connection" "docker exec guardflow_redis_prod redis-cli ping | grep -q PONG"

# Backend health endpoint
run_check "Backend Health Endpoint" "curl -f $HEALTH_ENDPOINT"

# API responsiveness
run_check "API Root Endpoint" "curl -f $API_ENDPOINT"

# Database migrations status
run_check "Database Migrations" "docker-compose -f docker-compose.production.yml exec -T backend alembic current"

echo ""
echo "==========================================="
echo "📊 Performance Metrics"
echo "==========================================="

# Get container stats
if command -v docker &> /dev/null; then
    echo "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
        guardflow_backend_prod guardflow_postgres_prod guardflow_redis_prod guardflow_celery_prod 2>/dev/null || \
        print_warning "Could not retrieve container stats"
fi

echo ""

# Check disk space
echo "Disk Usage:"
df -h / | tail -1 | awk '{print "Root partition: " $3 " used of " $2 " (" $5 " full)"}'

# Check memory usage
echo "Memory Usage:"
free -h | grep "^Mem" | awk '{print "Memory: " $3 " used of " $2}'

echo ""
echo "==========================================="
echo "📋 API Endpoints Test"
echo "==========================================="

# Test specific API endpoints (if backend is running)
if curl -f "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
    
    # Test documentation endpoint
    run_check "API Documentation" "curl -f $BACKEND_URL/docs"
    
    # Test OpenAPI schema
    run_check "OpenAPI Schema" "curl -f $BACKEND_URL/openapi.json"
    
else
    print_warning "Backend not responding, skipping API endpoint tests"
fi

echo ""
echo "==========================================="
echo "📝 Log Analysis"
echo "==========================================="

# Check for recent errors in logs
if [ -d "./logs" ]; then
    echo "Recent application logs:"
    find ./logs -name "*.log" -mtime -1 -exec echo "📄 {}" \; -exec tail -5 {} \; 2>/dev/null || \
        print_info "No recent log files found"
else
    print_info "Log directory not found"
fi

# Check Docker logs for errors
echo ""
echo "Recent container errors:"
for container in "${containers[@]}"; do
    if [ "$(get_container_status "$container")" = "running" ]; then
        error_count=$(docker logs "$container" --since="1h" 2>&1 | grep -i error | wc -l)
        if [ "$error_count" -gt 0 ]; then
            print_warning "$container has $error_count errors in the last hour"
            docker logs "$container" --since="1h" --tail=3 2>&1 | grep -i error || true
        fi
    fi
done

echo ""
echo "==========================================="
echo "📈 Summary Report"
echo "==========================================="

echo "Health Check Results:"
echo "  ✅ Passed: $CHECKS_PASSED"
echo "  ❌ Failed: $CHECKS_FAILED"
echo "  📊 Total:  $TOTAL_CHECKS"

if [ "$CHECKS_FAILED" -eq 0 ]; then
    print_status "All health checks passed! System is healthy 🎉"
    exit 0
elif [ "$CHECKS_FAILED" -lt 3 ]; then
    print_warning "Some checks failed, but system is mostly operational"
    exit 1
else
    print_error "Multiple critical checks failed! System needs attention"
    exit 2
fi