# Brevo Email Template Setup Guide

This guide explains how to upload the Flora Invitations email templates to Brevo and configure environment variables to reference them.

---

## Overview

The Flora Invitations Service has **7 email templates** for different sender contexts:

1. **gp-invitation.html** - GP invites LP or founder (shows GP's fund name)
2. **lp-invitation.html** - LP invites GP or founder (shows LP's name/entity)
3. **portfolio-founder-invitation.html** - Portfolio company founder invites team member
4. **admin-fund-invitation.html** - Admin invites as GP (fund-specific)
5. **admin-generic-invitation.html** - Admin platform invitation (non-portfolio)
6. **investment-invitation.html** - Dynamic fund/company context
7. **user-invitation.html** - Fallback generic template

**Current Setup:** The service uses local HTML files with Handlebars templating.

**Optional Brevo Setup:** Upload templates to Brevo for centralized management and use Brevo's template IDs.

---

## Option 1: Use Local Templates (Current Implementation)

**Status:** ✅ Already configured and working

The service renders templates locally using Handlebars and sends via Brevo's transactional email API.

**Pros:**
- Full control over template logic
- Handlebars helpers and dynamic context
- No additional Brevo setup required
- Templates version-controlled in Git

**Cons:**
- Templates must be redeployed for changes
- No visual template editor

**No action required** - this is the default and recommended approach.

---

## Option 2: Upload Templates to Brevo (Optional)

If you prefer to manage templates in Brevo's dashboard:

### Step 1: Access Brevo Templates

1. Log in to Brevo: https://app.brevo.com
2. Navigate to **Campaigns** → **Email Templates**
3. Click **Create a new template**

### Step 2: Upload Each Template

For each of the 7 templates:

#### A. Create Template in Brevo

1. Click **+ New Template**
2. Choose **Drag & Drop Editor** or **HTML Editor**
3. Name the template (e.g., "Flora GP Invitation")
4. Choose "Transactional" as template type

#### B. Add Template Content

**If using Drag & Drop Editor:**
- Design the email visually
- Add dynamic variables: `{{ params.VARIABLE_NAME }}`

**If using HTML Editor:**
1. Read the local template file:
   ```bash
   cat src/templates/emails/gp-invitation.html
   ```
2. Copy the HTML content
3. Replace Handlebars variables with Brevo syntax:
   - `{{senderContext.contextName}}` → `{{ params.fundName }}`
   - `{{inviteeEmail}}` → `{{ params.inviteeEmail }}`
   - `{{acceptUrl}}` → `{{ params.acceptUrl }}`
   - `{{role}}` → `{{ params.role }}`
   - `{{expiresAt}}` → `{{ params.expiresAt }}`

#### C. Save and Get Template ID

1. Click **Save & Activate**
2. Note the **Template ID** (shown in URL or template details)
3. Example: `https://app.brevo.com/camp/template/123` → ID is `123`

### Step 3: Variable Mapping

Each template needs these Brevo parameters:

| Local Handlebars Variable | Brevo Parameter | Description |
|---------------------------|-----------------|-------------|
| `{{senderContext.contextName}}` | `{{ params.contextName }}` | GP fund name, LP name, or company name |
| `{{inviteeEmail}}` | `{{ params.inviteeEmail }}` | Email address of invitee |
| `{{acceptUrl}}` | `{{ params.acceptUrl }}` | Invitation acceptance link |
| `{{role}}` | `{{ params.role }}` | User role (GP, LP, founder) |
| `{{expiresAt}}` | `{{ params.expiresAt }}` | Invitation expiration date |
| `{{personalMessage}}` | `{{ params.personalMessage }}` | Custom message from sender |

### Step 4: Configure Environment Variables

After uploading all 7 templates, add these environment variables to Railway:

```bash
# Navigate to invitations service
cd /Users/cope/Passbook_Oracle/microservices/flora-invitations-service

# Set Brevo template IDs
railway variables --set BREVO_GP_TEMPLATE_ID=<gp-template-id>
railway variables --set BREVO_LP_TEMPLATE_ID=<lp-template-id>
railway variables --set BREVO_FOUNDER_TEMPLATE_ID=<founder-template-id>
railway variables --set BREVO_ADMIN_FUND_TEMPLATE_ID=<admin-fund-template-id>
railway variables --set BREVO_ADMIN_GENERIC_TEMPLATE_ID=<admin-generic-template-id>
railway variables --set BREVO_INVESTMENT_TEMPLATE_ID=<investment-template-id>
railway variables --set BREVO_USER_TEMPLATE_ID=<user-template-id>

# Enable Brevo template mode
railway variables --set USE_BREVO_TEMPLATES=true
```

**Example:**
```bash
railway variables --set BREVO_GP_TEMPLATE_ID=15
railway variables --set BREVO_LP_TEMPLATE_ID=16
railway variables --set BREVO_FOUNDER_TEMPLATE_ID=17
railway variables --set BREVO_ADMIN_FUND_TEMPLATE_ID=18
railway variables --set BREVO_ADMIN_GENERIC_TEMPLATE_ID=19
railway variables --set BREVO_INVESTMENT_TEMPLATE_ID=20
railway variables --set BREVO_USER_TEMPLATE_ID=21
railway variables --set USE_BREVO_TEMPLATES=true
```

### Step 5: Update Email Service Code

Modify `src/services/emailService.js` to use Brevo templates when `USE_BREVO_TEMPLATES=true`:

```javascript
async sendInvitationEmail(invitation, context) {
  const useBrevoTemplates = process.env.USE_BREVO_TEMPLATES === 'true';

  if (useBrevoTemplates) {
    // Use Brevo template ID
    const templateId = this.getBrevoTemplateId(invitation, context);
    const params = this.buildBrevoParams(invitation, context);

    return await this.brevoClient.sendTransacEmail({
      templateId,
      params,
      to: [{ email: invitation.inviteeEmail }],
      sender: {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL
      }
    });
  } else {
    // Use local Handlebars templates (current implementation)
    const html = await this.templateService.renderTemplate(invitation, context);
    return await this.brevoClient.sendTransacEmail({
      htmlContent: html,
      to: [{ email: invitation.inviteeEmail }],
      sender: {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL
      }
    });
  }
}

getBrevoTemplateId(invitation, context) {
  const { role, invitationType, invitedBy } = invitation;

  if (role === 'gp' && invitationType === 'fund_associated') {
    return parseInt(process.env.BREVO_GP_TEMPLATE_ID);
  }
  if (role === 'lp' && invitationType === 'fund_associated') {
    return parseInt(process.env.BREVO_LP_TEMPLATE_ID);
  }
  if (role === 'portfolio_company') {
    return parseInt(process.env.BREVO_FOUNDER_TEMPLATE_ID);
  }
  if (invitedBy?.role === 'admin' && invitationType === 'fund_associated') {
    return parseInt(process.env.BREVO_ADMIN_FUND_TEMPLATE_ID);
  }
  if (invitedBy?.role === 'admin' && invitationType === 'platform') {
    return parseInt(process.env.BREVO_ADMIN_GENERIC_TEMPLATE_ID);
  }

  return parseInt(process.env.BREVO_USER_TEMPLATE_ID); // fallback
}

buildBrevoParams(invitation, context) {
  return {
    contextName: context.senderContext?.contextName,
    inviteeEmail: invitation.inviteeEmail,
    acceptUrl: `${process.env.FRONTEND_URL}/invite/accept/${invitation.token}`,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    personalMessage: invitation.personalMessage || ''
  };
}
```

### Step 6: Test Email Sending

After configuring template IDs:

```bash
# Redeploy service
railway up --service flora-invitations-service

# Monitor logs
railway logs --service flora-invitations-service

# Test invitation creation
curl -X POST https://flora-invitations-service-production.up.railway.app/api/v1/invitations/admin \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteeEmail": "test@example.com",
    "role": "gp",
    "invitationType": "fund_associated",
    "investmentContext": {
      "fundId": "fund123"
    }
  }'
```

---

## Template Upload Checklist

### For Each Template:

- [ ] **gp-invitation.html**
  - [ ] Upload to Brevo
  - [ ] Get template ID
  - [ ] Set `BREVO_GP_TEMPLATE_ID`
  - [ ] Test with GP invitation

- [ ] **lp-invitation.html**
  - [ ] Upload to Brevo
  - [ ] Get template ID
  - [ ] Set `BREVO_LP_TEMPLATE_ID`
  - [ ] Test with LP invitation

- [ ] **portfolio-founder-invitation.html**
  - [ ] Upload to Brevo
  - [ ] Get template ID
  - [ ] Set `BREVO_FOUNDER_TEMPLATE_ID`
  - [ ] Test with founder invitation

- [ ] **admin-fund-invitation.html**
  - [ ] Upload to Brevo
  - [ ] Get template ID
  - [ ] Set `BREVO_ADMIN_FUND_TEMPLATE_ID`
  - [ ] Test with admin fund invitation

- [ ] **admin-generic-invitation.html**
  - [ ] Upload to Brevo
  - [ ] Get template ID
  - [ ] Set `BREVO_ADMIN_GENERIC_TEMPLATE_ID`
  - [ ] Test with admin generic invitation

- [ ] **investment-invitation.html**
  - [ ] Upload to Brevo
  - [ ] Get template ID
  - [ ] Set `BREVO_INVESTMENT_TEMPLATE_ID`
  - [ ] Test with investment invitation

- [ ] **user-invitation.html**
  - [ ] Upload to Brevo
  - [ ] Get template ID
  - [ ] Set `BREVO_USER_TEMPLATE_ID`
  - [ ] Test as fallback

---

## Recommendation

**Keep using local templates** (current setup) because:

1. ✅ Handlebars allows complex logic and helpers
2. ✅ Templates are version-controlled
3. ✅ No additional Brevo configuration
4. ✅ Faster development and testing
5. ✅ Full control over rendering

**Use Brevo templates only if:**
- Non-technical team members need to edit email content
- You want visual template editing in Brevo dashboard
- Centralized template management across multiple services is required

---

## Current Status

**Active Setup:** Local Handlebars templates (recommended)

**Environment Variables Already Set:**
- ✅ `BREVO_API_KEY`
- ✅ `BREVO_API_URL`
- ✅ `BREVO_SENDER_EMAIL`
- ✅ `BREVO_SENDER_NAME`

**NOT Set (optional for Brevo templates):**
- ⏭️ `BREVO_GP_TEMPLATE_ID`
- ⏭️ `BREVO_LP_TEMPLATE_ID`
- ⏭️ `BREVO_FOUNDER_TEMPLATE_ID`
- ⏭️ `BREVO_ADMIN_FUND_TEMPLATE_ID`
- ⏭️ `BREVO_ADMIN_GENERIC_TEMPLATE_ID`
- ⏭️ `BREVO_INVESTMENT_TEMPLATE_ID`
- ⏭️ `BREVO_USER_TEMPLATE_ID`
- ⏭️ `USE_BREVO_TEMPLATES`

---

## Template Locations

All templates are in: `/microservices/flora-invitations-service/src/templates/emails/`

```
src/templates/emails/
├── gp-invitation.html
├── lp-invitation.html
├── portfolio-founder-invitation.html
├── admin-fund-invitation.html
├── admin-generic-invitation.html
├── investment-invitation.html
├── user-invitation.html
└── README.md
```

---

## Support

For Brevo template help:
- Brevo Docs: https://developers.brevo.com/docs/transactional-emails
- Template API: https://developers.brevo.com/reference/sendtransacemail
- Template Editor: https://app.brevo.com/camp/template/list

For local template modifications, edit HTML files in `src/templates/emails/` and redeploy.
