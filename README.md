# Tennis Court Finder

A Vue.js 3 web application that helps users find tennis courts in their area. The app searches OpenStreetMap data for tennis courts within a specified driving distance and provides addresses. Users must ensure they have permission to play at any courts before visiting the properties.

## Features

- **Location-based Search**: Enter an address or zip code and specify a maximum driving distance
- **Interactive Map**: Mapbox-powered map with satellite/street view toggle
- **Court Classification**: Differentiates between private residential, multi-family (apartments/condos), public facilities, and private clubs
- **Export Options**: Download results as CSV or copy addresses to clipboard
- **Magic Link Authentication**: Secure email-based login (no passwords)
- **Rate Limiting**: Daily search quotas to protect API usage
- **Admin Dashboard**: API usage monitoring and session management

## Tech Stack

- **Frontend**: Vue.js 3, Vite, Tailwind CSS, Pinia
- **Backend**: Netlify Functions (serverless)
- **Maps**: Mapbox GL JS
- **Data Source**: OpenStreetMap Overpass API
- **Email**: Resend API
- **Hosting**: Netlify

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Netlify CLI (`npm install -g netlify-cli`)
- API keys (see below)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tennis-court-finder.git
   cd tennis-court-finder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (copy from `.env.example` and fill in your values):
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   netlify dev
   ```

5. Open http://localhost:8888 in your browser

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

Tests are automatically run before every `git push` via a husky pre-push hook. If tests fail, the push is aborted.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_MAPBOX_TOKEN` | Mapbox public token | Yes |
| `RESEND_API_KEY` | Resend API key for emails | Yes |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) | Yes |
| `JWT_VERSION` | Token version for mass invalidation | Yes |
| `ALLOWED_EMAILS` | Comma-separated list of allowed emails | Yes |
| `ADMIN_EMAILS` | Comma-separated list of admin emails | Yes |
| `ADMIN_NOTIFICATION_EMAIL` | Email for waitlist notifications | Yes |
| `MAPBOX_TOKEN` | Mapbox token for server-side geocoding | Yes |

## Deployment

See [SETUP-INSTRUCTIONS.md](./SETUP-INSTRUCTIONS.md) for detailed deployment instructions.

### Quick Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Configure environment variables in Netlify dashboard
4. Deploy!

## Project Structure

```
tennis-court-finder/
├── .husky/
│   └── pre-push            # Git hook to run tests before push
├── netlify/
│   └── functions/          # Serverless backend functions
│       ├── utils/          # Shared utilities
│       │   ├── court-utils.js      # Court classification logic
│       │   └── court-utils.test.js # Tests for court utilities
│       ├── auth-*.js       # Authentication endpoints
│       ├── search-courts.js
│       ├── quota.js
│       ├── waitlist-add.js
│       └── admin-usage.js
├── src/
│   ├── components/         # Vue components
│   ├── views/              # Page components
│   ├── stores/             # Pinia stores
│   ├── utils/              # Frontend utilities
│   ├── assets/             # CSS and static assets
│   ├── App.vue
│   ├── main.js
│   └── router.js
├── public/                 # Static files
├── .env.example            # Environment variable template
├── netlify.toml            # Netlify configuration
├── package.json
├── vite.config.js
└── vitest.config.js        # Test configuration
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth-request-link` | POST | Request magic link email |
| `/api/auth-verify` | POST | Verify magic link token |
| `/api/auth-check` | GET | Check authentication status |
| `/api/auth-logout` | POST | Log out user |
| `/api/auth-invalidate-all` | POST | Invalidate all tokens (admin) |
| `/api/search-courts` | POST | Search for tennis courts |
| `/api/quota` | GET | Get user's quota |
| `/api/waitlist-add` | POST | Join waitlist |
| `/api/admin-usage` | GET | Get API usage (admin) |

## Data Sources

Tennis court locations are sourced from [OpenStreetMap](https://www.openstreetmap.org/), a collaborative mapping project. Coverage varies by region:

- **Metropolitan areas**: Generally excellent coverage
- **Rural areas**: May have incomplete data

The app classifies courts as:
- **Private Residential**: Courts on private single-family properties
- **Multi-Family**: Apartment complexes, condominiums, townhome communities
- **Public Facility**: Parks, schools, community centers
- **Private Club**: Tennis clubs, country clubs, resorts

## Example API calls

# Authentication
```
curl -s -X POST
   http://localhost:8888/.netlify/functions/auth-request-link \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}' | head -100
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the GitHub issue tracker.