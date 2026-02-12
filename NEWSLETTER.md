# Newsletter Feature

This document describes the newsletter feature that allows sending weekly and monthly email digests of notes and articles to subscribers.

## Overview

The newsletter feature consists of three main components:

1. **Web Preview Page** - View the newsletter content in the browser at `/newsletter`
2. **Email Template** - HTML email template for sending newsletters
3. **Send Script** - Command-line script for sending newsletters to subscribers

## Web Preview Page

### URL
- `/newsletter` - Default view (past week)
- `/newsletter?period=week` - Past week view
- `/newsletter?period=month` - Past month view

### Features
- Toggle between weekly and monthly views
- Shows articles separately from bookmarks/notes
- Displays all note metadata (date, folder, tags, excerpts)
- Full preview of what will be sent via email

## Email Configuration

Add the following environment variables to your `.env` file:

```bash
# Required for email sending
EMAIL_HOST=smtp.your-mail-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=newsletter@example.com
```

### Email Provider Examples

**Gmail:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**SendGrid:**
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
EMAIL_FROM=newsletter@yourdomain.com
```

**AWS SES:**
```bash
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-ses-smtp-username
EMAIL_PASS=your-ses-smtp-password
EMAIL_FROM=newsletter@yourdomain.com
```

## Subscribers Database

The script fetches subscribers from a PostgREST endpoint: `/subscribers`

### Expected Subscriber Schema

```json
{
  "email": "user@example.com",
  "frequency": "weekly"
}
```

### Frequency Values
- `"weekly"` or `"week"` - Receive newsletter every Monday
- `"monthly"` or `"month"` - Receive newsletter on the first Monday of each month

## Sending Newsletters

### Manual Sending

Run the script manually:

```bash
npm run send-newsletter
```

Or directly:

```bash
node src/send-newsletter.js
```

### Scheduled Sending

The script is designed to be run every Monday via a cron job or task scheduler.

#### Cron Job Example (Linux/Mac)

Edit your crontab:
```bash
crontab -e
```

Add this line to run every Monday at 9 AM:
```cron
0 9 * * 1 cd /path/to/express-notes && /usr/bin/node src/send-newsletter.js >> /var/log/newsletter.log 2>&1
```

#### Windows Task Scheduler

1. Open Task Scheduler
2. Create a new task
3. Set trigger: Weekly, every Monday at 9:00 AM
4. Set action: Start a program
   - Program: `node.exe`
   - Arguments: `C:\path\to\express-notes\src\send-newsletter.js`
   - Start in: `C:\path\to\express-notes`

#### PM2 (Node.js Process Manager)

Using PM2 with cron:
```bash
pm2 start src/send-newsletter.js --cron "0 9 * * 1" --no-autorestart
```

## How It Works

### Sending Logic

1. **Day Check**: Script only runs on Mondays (exits otherwise)
2. **Week Check**: Determines if it's the first Monday of the month
3. **Fetch Data**: 
   - Gets subscribers from PostgREST
   - Fetches notes from past week (for weekly) or past month (for monthly)
4. **Filter Subscribers**:
   - Weekly subscribers: Get email every Monday
   - Monthly subscribers: Get email only on first Monday of the month
5. **Send Emails**: Sends personalized newsletters to each subscriber

### Email Content

The email includes:
- **Articles Section**: Notes from the articles folder
- **Bookmarks & Notes Section**: All other notes
- Each note shows:
  - Title (linked to note page)
  - Excerpt or body preview
  - Date created
  - Folder name
  - Tags
- Footer with:
  - Link to online newsletter page
  - Unsubscribe information

## Testing

### Test the Web Page

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit: `http://localhost:3000/newsletter`

3. Toggle between weekly and monthly views

### Test Email Sending (Dry Run)

The script provides detailed console output showing:
- Current date and day of week
- Whether it's Monday and/or first Monday
- Number of subscribers found
- Breakdown of weekly vs monthly subscribers
- Number of notes/articles found
- Status of each email sent

Run the script on any day to see the logic:
```bash
npm run send-newsletter
```

Output example:
```
Starting newsletter send process...
Date: 2026-02-12T09:00:00.000Z
Not Monday - newsletters are only sent on Mondays. Exiting.
```

Or on a Monday:
```
Starting newsletter send process...
Date: 2026-02-15T09:00:00.000Z
Is Monday: Yes
Is First Monday of Month: No

Fetching subscribers...
Found 5 subscribers

Subscribers breakdown:
  Weekly: 3
  Monthly: 2

--- Sending Weekly Newsletters ---
Fetching notes from past week...
Found 12 notes and 2 articles
Sending to user1@example.com...
  ✓ Sent successfully
Sending to user2@example.com...
  ✓ Sent successfully
Sending to user3@example.com...
  ✓ Sent successfully

Skipping monthly newsletters (not the first Monday of the month)

=== Newsletter Send Complete ===
Successfully sent: 3
Failed: 0
```

## Troubleshooting

### No subscribers found
- Check that the PostgREST `/subscribers` endpoint is accessible
- Verify `POSTGREST_HOST` and `POSTGREST_TOKEN` in `.env`
- Check subscriber data exists in the database

### Email sending fails
- Verify email credentials in `.env` are correct
- Check SMTP host and port settings
- For Gmail, ensure "App Passwords" are enabled
- Check firewall/network allows SMTP connections

### Script doesn't run on schedule
- Verify cron job syntax
- Check script has execute permissions: `chmod +x src/send-newsletter.js`
- Review cron/task scheduler logs for errors
- Ensure `.env` file is accessible from scheduled task context

## Architecture

### Files Created

- `src/routes/newsletter.js` - Express route for web preview page
- `src/views/newsletter.handlebars` - Handlebars template for web page
- `src/email.js` - Email sending utilities (uses nodemailer)
- `src/newsletter-template.js` - HTML email template generator
- `src/send-newsletter.js` - Main CLI script for sending newsletters
- `src/data.js` - Added functions:
  - `getNotesFromPastWeek()`
  - `getNotesFromPastMonth()`
  - `getSubscribers()`

### Dependencies Added

- `nodemailer` - Email sending library

## Future Enhancements

Possible improvements:
- Add unsubscribe link functionality
- Track email open rates
- Allow subscribers to customize their preferences
- Add preview mode to send test emails
- Support for HTML/plain text email preference
- Add email templates for different themes
- Implement retry logic for failed emails
