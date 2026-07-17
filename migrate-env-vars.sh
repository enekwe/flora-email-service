#!/bin/bash

# Automated Environment Variable Migration
# Copies required env vars from passbook-flora to flora-email-service

set -e

SERVICE_NAME="flora-email-service-production"

echo "🔄 Migrating environment variables from passbook-flora to $SERVICE_NAME"
echo "========================================================================="
echo ""

# Function to get env var from passbook-flora
get_var() {
    local var_name=$1
    railway variables --service passbook-flora 2>/dev/null | grep "^║ $var_name " | awk -F'│' '{print $2}' | xargs
}

# Function to set env var on flora-email-service
set_var() {
    local var_name=$1
    local var_value=$2
    echo "Setting $var_name..."
    railway variables --service "$SERVICE_NAME" --set "$var_name=$var_value" 2>/dev/null
}

echo "📥 Retrieving variables from passbook-flora..."
echo ""

# Core Configuration
echo "Core Configuration:"
MONGODB_URI=$(get_var "MONGODB_URI")
JWT_SECRET=$(get_var "JWT_SECRET")
ENCRYPTION_KEY=$(get_var "ENCRYPTION_KEY")
SESSION_SECRET=$(get_var "SESSION_SECRET")

echo "  ✓ MONGODB_URI: ${MONGODB_URI:0:30}..."
echo "  ✓ JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "  ✓ ENCRYPTION_KEY: ${ENCRYPTION_KEY:0:10}..."
echo ""

# Brevo Configuration
echo "Brevo Email Configuration:"
BREVO_API_KEY=$(get_var "BREVO_API_KEY")
BREVO_API_URL=$(get_var "BREVO_API_URL")
BREVO_SENDER_EMAIL=$(get_var "BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME=$(get_var "BREVO_SENDER_NAME")

echo "  ✓ BREVO_API_KEY: ${BREVO_API_KEY:0:15}..."
echo "  ✓ BREVO_API_URL: $BREVO_API_URL"
echo "  ✓ BREVO_SENDER_EMAIL: $BREVO_SENDER_EMAIL"
echo "  ✓ BREVO_SENDER_NAME: $BREVO_SENDER_NAME"
echo ""

# IMAP/Gmail Configuration
echo "IMAP/Gmail Configuration:"
IMAP_EMAIL=$(get_var "IMAP_EMAIL")
IMAP_PASSWORD=$(get_var "IMAP_PASSWORD")
IMAP_HOST=$(get_var "IMAP_HOST")
IMAP_PORT=$(get_var "IMAP_PORT")

echo "  ✓ IMAP_EMAIL: $IMAP_EMAIL"
echo "  ✓ IMAP_PASSWORD: ${IMAP_PASSWORD:0:8}..."
echo "  ✓ IMAP_HOST: $IMAP_HOST"
echo "  ✓ IMAP_PORT: $IMAP_PORT"
echo ""

# Frontend/API URLs
echo "URLs Configuration:"
FRONTEND_URL=$(get_var "FRONTEND_URL")
API_BASE_URL=$(get_var "API_BASE_URL")
BACKEND_URL=$(get_var "BACKEND_URL")

echo "  ✓ FRONTEND_URL: $FRONTEND_URL"
echo "  ✓ API_BASE_URL: $API_BASE_URL"
echo "  ✓ BACKEND_URL: $BACKEND_URL"
echo ""

# API Key for service-to-service communication
echo "Service Communication:"
INVITATIONS_SERVICE_API_KEY=$(get_var "INVITATIONS_SERVICE_API_KEY")
if [ -n "$INVITATIONS_SERVICE_API_KEY" ]; then
    echo "  ✓ Found INVITATIONS_SERVICE_API_KEY: ${INVITATIONS_SERVICE_API_KEY:0:20}..."
    MAIN_APP_API_KEY="$INVITATIONS_SERVICE_API_KEY"
else
    echo "  ⚠️  INVITATIONS_SERVICE_API_KEY not found in passbook-flora"
    echo "  Will use JWT_SECRET as fallback"
    MAIN_APP_API_KEY="$JWT_SECRET"
fi
echo ""

echo "📤 Setting variables on $SERVICE_NAME..."
echo ""

# Set Core Variables
set_var "NODE_ENV" "production"
set_var "PORT" "3016"
set_var "MONGODB_URI" "$MONGODB_URI"
set_var "JWT_SECRET" "$JWT_SECRET"
set_var "ENCRYPTION_KEY" "$ENCRYPTION_KEY"

# Set Brevo Variables
set_var "BREVO_API_KEY" "$BREVO_API_KEY"
set_var "BREVO_API_URL" "$BREVO_API_URL"
set_var "BREVO_SENDER_EMAIL" "$BREVO_SENDER_EMAIL"
set_var "BREVO_SENDER_NAME" "$BREVO_SENDER_NAME"

# Set IMAP Variables
set_var "IMAP_EMAIL" "$IMAP_EMAIL"
set_var "IMAP_PASSWORD" "$IMAP_PASSWORD"
set_var "IMAP_HOST" "$IMAP_HOST"
set_var "IMAP_PORT" "$IMAP_PORT"
set_var "EMAIL_POLLING_INTERVAL" "60000"

# Set URL Variables
set_var "FRONTEND_URL" "$FRONTEND_URL"
set_var "API_BASE_URL" "$API_BASE_URL"
set_var "BACKEND_URL" "$BACKEND_URL"

# Set Service Communication
set_var "MAIN_APP_API_KEY" "$MAIN_APP_API_KEY"

# Additional Variables
set_var "EMAIL_AUTO_CATEGORIZE" "true"
set_var "EMAIL_CONFIDENCE_THRESHOLD" "70"

echo ""
echo "✅ Environment variable migration complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Deploy service: railway up --service $SERVICE_NAME"
echo "  2. Check health: curl https://flora-email-service-production.up.railway.app/health"
echo "  3. Update passbook-flora EMAIL_SERVICE_URL to point to new service"
echo ""
