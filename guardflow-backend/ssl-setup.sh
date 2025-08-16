#!/bin/bash
# SSL Certificate Setup Script for Guardflow Backend

set -e

echo "🔒 Setting up SSL certificates for Guardflow..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Configuration
DOMAIN="guardflow.tech"
EMAIL="admin@guardflow.tech"
WEBROOT="/var/www/certbot"

# Create webroot directory
mkdir -p "$WEBROOT"
print_status "Created webroot directory: $WEBROOT"

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    print_status "Installing certbot..."
    
    # Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot
    # CentOS/RHEL
    elif command -v yum &> /dev/null; then
        yum install -y certbot
    # Amazon Linux
    elif command -v amazon-linux-extras &> /dev/null; then
        amazon-linux-extras install -y certbot
    else
        print_error "Could not install certbot automatically. Please install it manually."
        exit 1
    fi
    
    print_status "Certbot installed successfully"
fi

# Stop nginx if running to avoid port conflicts
if systemctl is-active --quiet nginx; then
    print_warning "Stopping nginx temporarily for certificate generation..."
    systemctl stop nginx
    RESTART_NGINX=true
fi

# Generate certificates
print_status "Generating SSL certificates..."

certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "api.$DOMAIN" \
    -d "app.$DOMAIN"

if [ $? -eq 0 ]; then
    print_status "SSL certificates generated successfully!"
else
    print_error "Certificate generation failed!"
    exit 1
fi

# Set up auto-renewal
print_status "Setting up auto-renewal..."

# Create renewal script
cat > /etc/cron.d/certbot-renewal << EOF
# Renew SSL certificates twice daily
0 12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
0 0 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

print_status "Auto-renewal configured"

# Test renewal
print_status "Testing certificate renewal..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    print_status "Renewal test passed"
else
    print_warning "Renewal test failed, but certificates are still valid"
fi

# Start nginx if we stopped it
if [ "$RESTART_NGINX" = true ]; then
    print_status "Starting nginx..."
    systemctl start nginx
fi

# Display certificate information
print_status "Certificate installation complete!"
echo ""
echo "📜 Certificate Details:"
certbot certificates

echo ""
echo "🔧 Next Steps:"
echo "1. Update your nginx configuration to use the certificates:"
echo "   ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;"
echo "   ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
echo ""
echo "2. Test your SSL configuration:"
echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "3. Certificates will auto-renew via cron job"

print_status "SSL setup completed successfully! 🔒"