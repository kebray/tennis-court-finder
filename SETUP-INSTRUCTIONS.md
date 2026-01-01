# Setup Instructions

This guide walks you through setting up Tennis Court Finder from scratch, including creating the GitHub repository and deploying to Netlify.

## Prerequisites

Before you begin, ensure you have:

- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] A GitHub account
- [ ] A Netlify account (free tier works)
- [ ] A Mapbox account with an API token
- [ ] A Resend account with an API key

## Step 1: Initialize Git Repository

Open a terminal in the project directory and run:

```bash
# Initialize a new git repository
git init

# Add all files to staging
git add .

# Create the initial commit
git commit -m "Initial commit: Tennis Court Finder app"
```

## Step 2: Create GitHub Repository

### Option A: Using GitHub CLI (recommended)

If you have the GitHub CLI installed:

```bash
# Create a new public repository and push
gh repo create tennis-court-finder --public --source=. --remote=origin --push
```

### Option B: Using GitHub Web Interface

1. Go to https://github.com/new
2. Enter repository name: `tennis-court-finder`
3. Choose "Public" or "Private"
4. Do NOT initialize with README (we already have one)
5. Click "Create repository"
6. Follow the instructions to push an existing repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/tennis-court-finder.git
git branch -M main
git push -u origin main
```

## Step 3: Set Up Netlify

### Connect to Netlify

1. Log in to [Netlify](https://app.netlify.com/)
2. Click "Add new site" > "Import an existing project"
3. Choose "GitHub"
4. Authorize Netlify to access your repositories
5. Select the `tennis-court-finder` repository

### Configure Build Settings

Netlify should auto-detect these, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### Configure Environment Variables

Go to Site Settings > Environment Variables and add:

| Variable | Value |
|----------|-------|
| `VITE_MAPBOX_TOKEN` | Your Mapbox public token |
| `MAPBOX_TOKEN` | Your Mapbox public token (same as above) |
| `RESEND_API_KEY` | Your Resend API key |
| `JWT_SECRET` | A secure random string (32+ characters) |
| `JWT_VERSION` | `1` |
| `ALLOWED_EMAILS` | `youremail@gmail.com` (or your email) |
| `ADMIN_EMAILS` | `youremail@gmail.com` (or your email) |
| `ADMIN_NOTIFICATION_EMAIL` | `youremail+tenniscourtfinder@gmail.com` |

**To generate a secure JWT_SECRET:**
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Deploy

1. Click "Deploy site"
2. Wait for the build to complete
3. Your site will be live at `https://[random-name].netlify.app`

### Custom Domain (Optional)

1. Go to Site Settings > Domain Management
2. Click "Add custom domain"
3. Follow the DNS configuration instructions

## Step 4: Configure Resend (Email)

For magic link emails to work properly in production:

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add and verify your domain
3. Update the `from` address in `netlify/functions/auth-request-link.js` to use your domain

**Note**: With a free Resend account, you can only send to your own email address until you verify a domain.

## Step 5: Test the Deployment

1. Visit your Netlify URL
2. Enter your allowed email address
3. Check your email for the magic link
4. Click the link to sign in
5. Test the search functionality

## Updating the Application

### Making Changes

1. Make your changes locally
2. Test with `netlify dev`
3. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
4. Push to GitHub:
   ```bash
   git push
   ```
5. Netlify will automatically redeploy

### Adding New Allowed Users

1. Go to Netlify Dashboard > Site Settings > Environment Variables
2. Edit `ALLOWED_EMAILS`
3. Add the new email, comma-separated: `user1@example.com,user2@example.com`
4. Trigger a new deploy (or wait for the next push)

### Invalidating All Sessions

To force all users to re-authenticate:

1. Go to Netlify Dashboard > Site Settings > Environment Variables
2. Increment `JWT_VERSION` (e.g., `1` → `2`)
3. Trigger a new deploy

## Troubleshooting

### Emails Not Sending

- Verify your Resend API key is correct
- Check if you've exceeded Resend's free tier limits
- In development, check the Netlify function logs

### Authentication Issues

- Ensure JWT_SECRET is set and matches between deploys
- Check that your email is in ALLOWED_EMAILS
- Verify cookies are being set (check browser DevTools)

### Map Not Loading

- Verify VITE_MAPBOX_TOKEN is set correctly
- Check browser console for Mapbox errors
- Ensure your Mapbox account is active

### Search Not Working

- Check Netlify function logs for errors
- Verify the Overpass API is accessible
- Ensure you haven't exceeded your daily quota

## Local Development Tips

### Running Locally

```bash
# Install dependencies
npm install

# Start development server with Netlify functions
netlify dev
```

### Testing Email Locally

During local development, magic link emails will be sent to real email addresses. Make sure your `.env` has the correct `RESEND_API_KEY`.

### Checking Function Logs

```bash
# View real-time function logs
netlify functions:serve
```

## Security Notes

- Never commit `.env` files to git
- Keep your JWT_SECRET secure and unique per environment
- Regularly rotate your API keys
- Monitor your API usage to detect abuse
- The `instructions.md` file contains sensitive data and is gitignored

## Getting Help

- Check the [README.md](./README.md) for general information
- Review the [plan.md](./plan.md) for architecture details
- Open an issue on GitHub for bugs or feature requests
