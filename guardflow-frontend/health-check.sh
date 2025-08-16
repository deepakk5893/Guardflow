#!/bin/bash
# Guardflow Frontend Health Check and Monitoring Script

set -e

echo "🏥 Guardflow Frontend Health Check"

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
FRONTEND_URL="http://localhost:3000"
HEALTH_ENDPOINT="$FRONTEND_URL/health"

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

# Check Docker container
container="guardflow_frontend_prod"
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

echo ""
echo "==========================================="
echo "🔍 Service Health Checks"
echo "==========================================="

# Frontend health endpoint
run_check "Frontend Health Endpoint" "curl -f $HEALTH_ENDPOINT"

# Frontend main page
run_check "Frontend Main Page" "curl -f $FRONTEND_URL"

# Check if static assets are being served
run_check "Static Assets" "curl -f $FRONTEND_URL/assets/ || curl -f $FRONTEND_URL/static/"

echo ""
echo "==========================================="
echo "📊 Performance Metrics"
echo "==========================================="

# Get container stats
if command -v docker &> /dev/null; then
    echo "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
        guardflow_frontend_prod 2>/dev/null || \
        print_warning "Could not retrieve container stats"
fi

echo ""

# Check response times
echo "Response Time Test:"
if command -v curl &> /dev/null; then
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$FRONTEND_URL" 2>/dev/null || echo "failed")
    if [ "$response_time" != "failed" ]; then
        echo "Frontend response time: ${response_time}s"
        
        # Convert to milliseconds for easier reading
        response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "unknown")
        if [ "$response_ms" != "unknown" ]; then
            echo "Frontend response time: ${response_ms}ms"
        fi
    else
        print_warning "Could not measure response time"
    fi
fi

echo ""
echo "==========================================="
echo "🌐 Network Connectivity"
echo "==========================================="

# Check if frontend can reach backend (if configured)
if [ -f ".env.production" ] && grep -q "VITE_API_BASE_URL" .env.production; then
    API_URL=$(grep "VITE_API_BASE_URL" .env.production | cut -d '=' -f2)
    if [ -n "$API_URL" ]; then
        run_check "Backend Connectivity" "curl -f $API_URL/health"
    fi
fi

# Check DNS resolution for production domains
if command -v nslookup &> /dev/null; then
    echo "DNS Resolution Check:"
    domains=("guardflow.tech" "app.guardflow.tech" "api.guardflow.tech")
    for domain in "${domains[@]}"; do
        if nslookup "$domain" > /dev/null 2>&1; then
            print_status "$domain resolves correctly"
        else
            print_warning "$domain DNS resolution failed"
        fi
    done
fi

echo ""
echo "==========================================="
echo "📱 Frontend Validation"
echo "==========================================="

# Check if the page contains expected content
if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
    content=$(curl -s "$FRONTEND_URL")
    
    # Check for HTML structure
    if echo "$content" | grep -q "<html"; then
        print_status "Valid HTML structure detected"
    else
        print_warning "No HTML structure found"
    fi
    
    # Check for React app
    if echo "$content" | grep -q "react\|React"; then
        print_status "React application detected"
    else
        print_info "React references not found in initial HTML"
    fi
    
    # Check for app title
    if echo "$content" | grep -q -i "guardflow"; then
        print_status "App title/branding found"
    else
        print_warning "App branding not found in page"
    fi
fi

echo ""
echo "==========================================="
echo "📝 Log Analysis"
echo "==========================================="

# Check Docker logs for errors
echo "Recent container logs:"
if [ "$(get_container_status "$container")" = "running" ]; then
    error_count=$(docker logs "$container" --since="1h" 2>&1 | grep -i error | wc -l)
    if [ "$error_count" -gt 0 ]; then
        print_warning "$container has $error_count errors in the last hour"
        echo "Recent errors:"
        docker logs "$container" --since="1h" --tail=5 2>&1 | grep -i error || true
    else
        print_status "No errors found in recent logs"
    fi
    
    # Show last few log entries
    echo ""
    echo "Last 3 log entries:"
    docker logs "$container" --tail=3 2>&1
else
    print_warning "Container not running, cannot check logs"
fi

echo ""
echo "==========================================="
echo "🔧 Build Information"
echo "==========================================="

# Check build information if available
if [ -f "package.json" ]; then
    echo "Package Information:"
    if command -v jq &> /dev/null; then
        jq -r '.name + " v" + .version' package.json 2>/dev/null || \
            grep -E '"name"|"version"' package.json | head -2
    else
        grep -E '"name"|"version"' package.json | head -2
    fi
fi

# Check if source maps are disabled in production
if [ -f ".env.production" ]; then
    if grep -q "GENERATE_SOURCEMAP=false" .env.production; then
        print_status "Source maps disabled for production"
    else
        print_warning "Source maps may be enabled (check GENERATE_SOURCEMAP setting)"
    fi
fi

echo ""
echo "==========================================="
echo "📈 Summary Report"
echo "==========================================="

echo "Health Check Results:"
echo "  ✅ Passed: $CHECKS_PASSED"
echo "  ❌ Failed: $CHECKS_FAILED"
echo "  📊 Total:  $TOTAL_CHECKS"

if [ "$CHECKS_FAILED" -eq 0 ]; then
    print_status "All health checks passed! Frontend is healthy 🎉"
    exit 0
elif [ "$CHECKS_FAILED" -lt 2 ]; then
    print_warning "Some checks failed, but frontend is mostly operational"
    exit 1
else
    print_error "Multiple critical checks failed! Frontend needs attention"
    exit 2
fi