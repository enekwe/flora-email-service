#!/bin/bash

# Flora Email Service - Railway Deployment Script
# This script migrates environment variables from passbook-flora and deploys the email service

set -e

echo "🚀 Flora Email Service - Railway Deployment"
echo "============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found. Please install it first:${NC}"
    echo "npm install -g @railway/cli"
    exit 1
fi

echo -e "${BLUE}Step 1: Setting up environment variables${NC}"
echo ""

# Service name
SERVICE_NAME="flora-email-service-production"

echo "📋 Migrating environment variables from passbook-flora..."
echo ""

# Core Database & API
echo -e "${GREEN}Setting core variables...${NC}"
railway variables --set NODE_ENV=production --service "$SERVICE_NAME" 2>/dev/null || echo "Will set after service creation"
railway variables --set PORT=3016 --service "$SERVICE_NAME" 2>/dev/null || echo "Will set after service creation"

# MongoDB (copy from passbook-flora)
echo -e "${YELLOW}⚠️  MONGODB_URI needs to be copied from passbook-flora${NC}"
echo "Run: railway variables --service passbook-flora | grep MONGODB_URI"
echo ""

# JWT Secret (must match passbook-flora for authentication)
echo -e "${YELLOW}⚠️  JWT_SECRET must match passbook-flora${NC}"
echo "Run: railway variables --service passbook-flora | grep JWT_SECRET"
echo ""

# Brevo Email Sending (copy from passbook-flora)
echo -e "${GREEN}Setting Brevo variables...${NC}"
echo "These will be copied from passbook-flora:"
echo "  - BREVO_API_KEY"
echo "  - BREVO_API_URL"
echo "  - BREVO_SENDER_EMAIL"
echo "  - BREVO_SENDER_NAME"
echo ""

# IMAP Credentials (copy from passbook-flora)
echo -e "${GREEN}Setting IMAP/Gmail variables...${NC}"
echo "These will be copied from passbook-flora:"
echo "  - IMAP_EMAIL"
echo "  - IMAP_PASSWORD"
echo "  - IMAP_HOST"
echo "  - IMAP_PORT"
echo ""

# Encryption Key (copy from passbook-flora)
echo -e "${YELLOW}⚠️  ENCRYPTION_KEY must match passbook-flora${NC}"
echo "Run: railway variables --service passbook-flora | grep ENCRYPTION_KEY"
echo ""

# Frontend URL
echo -e "${GREEN}Setting frontend URL...${NC}"
echo "Will use: https://flora.passbook.vc"
echo ""

# API Key for service-to-service communication
echo -e "${YELLOW}⚠️  MAIN_APP_API_KEY needs to be set${NC}"
echo "This should match INVITATIONS_SERVICE_API_KEY in passbook-flora"
echo ""

echo ""
echo -e "${BLUE}Step 2: Manual Environment Variable Setup${NC}"
echo ""
echo "Please run the following commands to copy env vars from passbook-flora:"
echo ""
echo -e "${GREEN}# Get values from passbook-flora:${NC}"
echo "railway variables --service passbook-flora | grep -E 'MONGODB_URI|JWT_SECRET|BREVO_|IMAP_|ENCRYPTION_KEY|INVITATIONS_SERVICE_API_KEY'"
echo ""
echo -e "${GREEN}# Then set them for flora-email-service:${NC}"
echo "railway variables --service $SERVICE_NAME --set MONGODB_URI='<value>'"
echo "railway variables --service $SERVICE_NAME --set JWT_SECRET='<value>'"
echo "railway variables --service $SERVICE_NAME --set BREVO_API_KEY='<value>'"
echo "railway variables --service $SERVICE_NAME --set BREVO_API_URL='https://api.brevo.com/v3'"
echo "railway variables --service $SERVICE_NAME --set BREVO_SENDER_EMAIL='flora@passbook.vc'"
echo "railway variables --service $SERVICE_NAME --set BREVO_SENDER_NAME='Passbook Flora'"
echo "railway variables --service $SERVICE_NAME --set IMAP_EMAIL='crm@flora.passbook.vc'"
echo "railway variables --service $SERVICE_NAME --set IMAP_PASSWORD='<value>'"
echo "railway variables --service $SERVICE_NAME --set IMAP_HOST='imap.gmail.com'"
echo "railway variables --service $SERVICE_NAME --set IMAP_PORT='993'"
echo "railway variables --service $SERVICE_NAME --set ENCRYPTION_KEY='<value>'"
echo "railway variables --service $SERVICE_NAME --set MAIN_APP_API_KEY='<value>'"
echo "railway variables --service $SERVICE_NAME --set FRONTEND_URL='https://flora.passbook.vc'"
echo "railway variables --service $SERVICE_NAME --set API_BASE_URL='https://api.flora.passbook.vc'"
echo ""
echo -e "${BLUE}Step 3: Deploy${NC}"
echo ""
echo "After setting environment variables, deploy with:"
echo "railway up --service $SERVICE_NAME"
echo ""
echo -e "${BLUE}Step 4: Verify${NC}"
echo ""
echo "Check health endpoint:"
echo "curl https://flora-email-service-production.up.railway.app/health"
echo ""
echo "Expected response:"
echo '{"status":"healthy","timestamp":"2026-07-17T...","service":"flora-email-service","version":"2.0.0","database":"connected"}'
echo ""
echo -e "${GREEN}✅ Deployment guide complete${NC}"
