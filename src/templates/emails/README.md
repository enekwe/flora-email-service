# Flora Invitations Email Templates

This directory contains email templates for the Flora Invitations Microservice. All templates follow the Flora design system with the pink gradient (#b7046c to #e11d48) and are fully mobile-responsive and GDPR-compliant.

## Template Selection Guide

### 1. gp-invitation.html
**Use when:** GP (General Partner) sending invitation to LP or portfolio company
**Context:** Fund-scoped invitation from fund manager
**Variables:**
- `{{contextName}}` - GP's fund name (e.g., "Acme Ventures Fund I")
- `{{inviteeName}}` - Recipient name
- `{{role}}` - Role being invited to
- `{{inviteLink}}` - Acceptance URL
- `{{personalMessage}}` - Optional message from GP
- `{{unsubscribeLink}}` - GDPR unsubscribe

### 2. lp-invitation.html
**Use when:** LP (Limited Partner) sending invitation to GP or founder they've invested in
**Context:** Investor-initiated invitation
**Variables:**
- `{{contextName}}` - LP's name (e.g., "Jane Smith") OR entity name ("Smith Family Office")
- `{{contextType}}` - "person" or "institution"
- `{{inviteeName}}` - Recipient name
- `{{role}}` - Role being invited to
- `{{inviteLink}}` - Acceptance URL
- `{{personalMessage}}` - Optional message from LP
- `{{unsubscribeLink}}` - GDPR unsubscribe

### 3. portfolio-founder-invitation.html
**Use when:** Founder sending invitation to team member or investor
**Context:** Portfolio company team invitation
**Variables:**
- `{{contextName}}` - Company name (e.g., "Acme Inc")
- `{{inviteeName}}` - Recipient name
- `{{role}}` - Role being invited to
- `{{inviteLink}}` - Acceptance URL
- `{{personalMessage}}` - Optional message from founder
- `{{unsubscribeLink}}` - GDPR unsubscribe

### 4. admin-fund-invitation.html
**Use when:** Admin sending fund-specific invitation (acting as GP)
**Context:** Administrative fund access grant
**Variables:**
- `{{contextName}}` - Fund name
- `{{inviteeName}}` - Recipient name
- `{{role}}` - Role being invited to
- `{{inviteLink}}` - Acceptance URL
- `{{personalMessage}}` - Optional admin message
- `{{unsubscribeLink}}` - GDPR unsubscribe

### 5. admin-generic-invitation.html
**Use when:** Admin sending generic platform invitation (non-portfolio)
**Context:** General platform access for advisors, service providers, etc.
**Variables:**
- `{{inviteeName}}` - Recipient name
- `{{role}}` - Role being invited to (advisor, service_provider, etc.)
- `{{inviteLink}}` - Acceptance URL
- `{{personalMessage}}` - Optional admin message
- `{{unsubscribeLink}}` - GDPR unsubscribe

### 6. investment-invitation.html
**Use when:** Generic investment-scoped invitation
**Context:** Flexible investment relationship invitation
**Variables:**
- `{{contextName}}` - Fund OR Company name
- `{{contextType}}` - "fund" or "company"
- `{{inviteeName}}` - Recipient name
- `{{role}}` - Role being invited to
- `{{investmentRole}}` - Investment role (gp_partner, lp_investor, etc.)
- `{{inviteLink}}` - Acceptance URL
- `{{personalMessage}}` - Optional message
- `{{unsubscribeLink}}` - GDPR unsubscribe

### 7. user-invitation.html
**Use when:** Fallback for generic invitations or when specific context is unclear
**Context:** Default invitation template
**Variables:**
- `{{name}}` - Recipient name
- `{{email}}` - Recipient email
- `{{role}}` - Role being invited to
- `{{inviteLink}}` - Acceptance URL
- `{{personalMessage}}` - Optional message
- `{{unsubscribeLink}}` - GDPR unsubscribe

## Design System

### Colors
- Primary gradient: `linear-gradient(135deg, #b7046c 0%, #e11d48 100%)`
- Text primary: `#1f2937`
- Text secondary: `#6b7280`
- Background: `#f9fafb`
- Role badge background: `#fce7f3`
- Role badge text: `#b7046c`

### Typography
- Font family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- Title: 24px (20px mobile), bold
- Subtitle: 16px, gray
- Body: 16px, line-height 1.7

### Components
- **CTA Button**: Pink gradient, 14px padding (vertical), 28px padding (horizontal), 8px border-radius
- **Info Box**: Gray background (#f3f4f6), pink left border (4px), 16px padding
- **Role Badge**: Pink badge with rounded corners
- **Personal Message Box**: Pink background (#fce7f3), pink left border

## GDPR Compliance

All templates include:
- Unsubscribe link
- GDPR rights information
- Data processing notice
- Contact information for privacy inquiries
- Support contact for errors

## Mobile Responsive

All templates are mobile-responsive with:
- Flexible container (max-width: 600px)
- Responsive padding adjustments
- Block-level CTA buttons on mobile
- Reduced font sizes on mobile

## Testing

Use Handlebars/Mustache syntax for variable replacement:
- `{{variableName}}` - Simple variable
- `{{#variableName}}...{{/variableName}}` - Conditional block

## Brand Assets

- Flora Logo: `https://flora.passbook.vc/Passbook_Flora_PinkDirt(1).png`
- Passbook Stamp: `https://flora.passbook.vc/passbook-logo.png`

## Support

For template issues or questions:
- Email: support@passbook.vc
- Privacy: privacy@passbook.vc
