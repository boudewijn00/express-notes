# Newsletter Quick Start Guide

This guide will help you get the newsletter feature up and running quickly.

## Prerequisites

- Node.js and npm installed
- PostgREST database with notes and folders
- SMTP email server credentials (Gmail, SendGrid, AWS SES, etc.)

## Step 1: Install Dependencies

Dependencies have already been installed if you ran `npm install`. The newsletter feature requires:
- `nodemailer` - for sending emails

```bash
npm install
```

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```bash
# Required - PostgREST Configuration
POSTGREST_HOST=https://your-postgrest-instance.com
POSTGREST_TOKEN=Bearer your-jwt-token

# Required for sending emails
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Newsletter <newsletter@gmail.com>
```

### Gmail Setup

If using Gmail, you need to generate an App Password:
1. Go to your Google Account settings
2. Security → 2-Step Verification (must be enabled)
3. App passwords → Generate new
4. Use the generated password as `EMAIL_PASS`

## Step 3: Set Up Subscribers Database

Create a `subscribers` table in your PostgreSQL database:

```sql
CREATE TABLE subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Add some test subscribers:

```sql
INSERT INTO subscribers (email, frequency) VALUES
    ('your-email@gmail.com', 'weekly'),
    ('test@example.com', 'monthly');
```

Make sure PostgREST exposes this table via `/subscribers` endpoint.

## Step 4: Test the Web Preview

Start the development server:

```bash
npm run dev
```

Visit the newsletter page in your browser:
- http://localhost:3000/newsletter (weekly view)
- http://localhost:3000/newsletter?period=month (monthly view)

You should see a preview of the newsletter with notes from the past week/month.

## Step 5: Test Email Sending

Run the newsletter send script:

```bash
npm run send-newsletter
```

**Note:** The script only sends emails on Mondays. If today is not Monday, you'll see:
```
Not Monday - newsletters are only sent on Mondays. Exiting.
```

To test email sending immediately regardless of the day, you can temporarily modify the script or wait until Monday.

## Step 6: Schedule the Newsletter

### Option A: Cron (Linux/Mac)

Edit your crontab:
```bash
crontab -e
```

Add this line to run every Monday at 9 AM:
```cron
0 9 * * 1 cd /path/to/express-notes && node src/send-newsletter.js >> /var/log/newsletter.log 2>&1
```

### Option B: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Weekly, every Monday at 9:00 AM
4. Action: Start a program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `src/send-newsletter.js`
   - Start in: `C:\path\to\express-notes`

### Option C: PM2 (Node.js Process Manager)

```bash
pm2 start src/send-newsletter.js --cron "0 9 * * 1" --no-autorestart --name "newsletter-sender"
```

## Verification

After the script runs on a Monday, check:

1. **Console Output**: Review logs to see if emails were sent successfully
2. **Email Inbox**: Check subscriber emails for the newsletter
3. **Error Logs**: If using cron, check log file for any errors

## Troubleshooting

### Problem: No subscribers found
**Solution:** Verify PostgREST endpoint `/subscribers` is accessible and returns data

### Problem: Email sending fails
**Solutions:**
- Verify SMTP credentials are correct
- For Gmail, ensure App Password is used (not regular password)
- Check firewall allows outbound SMTP connections
- Try a different SMTP port (465 for SSL, 587 for TLS)

### Problem: Script doesn't run on schedule
**Solutions:**
- Verify cron syntax with `crontab -l`
- Check script has execute permissions: `chmod +x src/send-newsletter.js`
- Ensure full absolute paths are used in cron job
- Check cron logs: `grep CRON /var/log/syslog` (Linux)

## Next Steps

- Customize the email template in `src/newsletter-template.js`
- Modify the newsletter page layout in `src/views/newsletter.handlebars`
- Add more subscriber management features
- Implement unsubscribe functionality
- Set up email analytics/tracking

For more detailed information, see [NEWSLETTER.md](NEWSLETTER.md).
