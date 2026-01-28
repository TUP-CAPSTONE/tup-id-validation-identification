# Email Verification Setup Guide

## Overview
The student registration form now verifies both student and guardian email addresses by sending verification codes. This ensures that the emails entered are real and accessible.

## How It Works
1. User fills out the registration form
2. Clicks "Send Verification Codes"
3. System sends 6-digit codes to both student and guardian emails
4. User enters both codes to complete registration
5. If codes match, registration is saved to Firebase

## Setup Instructions

### 1. Install Dependencies
Already installed: `nodemailer` and `@types/nodemailer`

### 2. Configure Email Service
Create a `.env.local` file in the root directory (copy from `.env.example`):

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 3. For Gmail Users (Recommended):
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to https://myaccount.google.com/apppasswords
4. Create a new App Password for "Mail"
5. Copy the generated password (16 characters)
6. Use this password in `EMAIL_PASSWORD` (not your regular Gmail password)

### 4. For Other Email Providers:
Edit `src/app/api/send-verification/route.ts` and change the transporter configuration:

**For Outlook/Hotmail:**
```typescript
const transporter = nodemailer.createTransporter({
  service: 'hotmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

**For Yahoo:**
```typescript
const transporter = nodemailer.createTransporter({
  service: 'yahoo',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

**For Custom SMTP:**
```typescript
const transporter = nodemailer.createTransporter({
  host: 'smtp.yourdomain.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

## Testing

1. Start your development server: `npm run dev`
2. Go to the registration page
3. Fill in all fields with real email addresses you can access
4. Click "Send Verification Codes"
5. Check both inboxes for verification codes
6. Enter both codes and complete registration

## Security Notes

- Verification codes expire in 10 minutes (mentioned in email)
- Codes are 6 digits (100000-999999)
- Both emails must be verified before registration completes
- Email addresses are validated for proper format
- Failed email deliveries show specific error messages

## Troubleshooting

**"Failed to send verification codes"**
- Check your `.env.local` file exists and has correct credentials
- Verify your email service allows SMTP access
- For Gmail, ensure you're using an App Password, not your regular password

**"Invalid email address"**
- Email must be a real, working email address
- System will attempt to send and will fail if mailbox doesn't exist

**Email not received**
- Check spam/junk folder
- Verify email address is typed correctly
- Try resending codes using the "Resend Codes" button

## Production Considerations

For production deployment:
1. Use environment variables in your hosting platform (Vercel, Netlify, etc.)
2. Consider using a professional email service (SendGrid, Mailgun, AWS SES)
3. Implement rate limiting to prevent abuse
4. Store verification codes server-side with expiration timestamps
5. Add email verification tracking to your database
