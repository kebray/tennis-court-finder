# Claude Code Context - Tennis Court Finder

## Project Overview

Tennis Court Finder is a web application that helps users locate tennis courts within a specified driving distance from a starting address. It uses OpenStreetMap data via the Overpass API and displays results on an interactive Mapbox map.

## Tech Stack

- **Frontend:** Vue.js 3 (Composition API), Vite, Tailwind CSS, Pinia (state management)
- **Backend:** Netlify Functions (serverless)
- **APIs:**
  - Mapbox GL JS - interactive maps and geocoding
  - OpenStreetMap Overpass API - tennis court data
  - OpenStreetMap Nominatim - reverse geocoding fallback
  - Resend - transactional emails
- **Authentication:** Magic link email login with JWT sessions
- **Hosting:** Netlify

## Project Structure

```
├── src/
│   ├── components/       # Vue components
│   │   ├── MapView.vue      # Mapbox map with markers
│   │   ├── ResultsTable.vue # Filterable results table
│   │   ├── SearchForm.vue   # Address search form (collapsible)
│   │   └── QuotaDisplay.vue # Daily search quota display
│   ├── views/            # Page components
│   │   ├── HomeView.vue     # Main app (authenticated)
│   │   ├── LoginView.vue    # Login page
│   │   ├── AdminView.vue    # Admin dashboard
│   │   └── AboutView.vue    # About page
│   ├── stores/           # Pinia stores
│   │   ├── auth.js          # Authentication state
│   │   ├── search.js        # Search state and geocoding
│   │   └── results.js       # Court results and filtering
│   ├── router/           # Vue Router config
│   └── App.vue           # Root component
├── .husky/
│   └── pre-push              # Git hook to run tests before push
├── netlify/functions/    # Serverless backend
│   ├── auth-request-link.js  # Magic link generation
│   ├── auth-verify.js        # Token verification
│   ├── auth-logout.js        # Session logout
│   ├── auth-check.js         # Session validation
│   ├── search-courts.js      # Main search endpoint
│   ├── waitlist-add.js       # Waitlist signup
│   ├── admin-*.js            # Admin endpoints
│   └── utils/                # Shared utilities
│       ├── auth.js              # JWT, email validation
│       ├── response.js          # HTTP response helpers
│       ├── storage.js           # Quota tracking, waitlist
│       ├── court-utils.js       # Court classification logic (tested)
│       └── court-utils.test.js  # Tests for court utilities
├── public/               # Static assets
├── .env                  # Local environment (gitignored)
├── .env.example          # Environment template
├── netlify.toml          # Netlify configuration
├── vitest.config.js      # Test configuration
├── TODO.md               # Future enhancements (gitignored)
└── instructions.md       # Original requirements (gitignored)
```

## Key Features

1. **Magic Link Authentication** - Users receive email links to login (no passwords)
2. **Court Search** - Query OpenStreetMap for tennis courts within radius
3. **Court Classification** - Categorizes as Private/Multi-Family/Public/Club based on OSM tags and nearby features
4. **Filtering** - Filter by type, verified status, has real address
5. **Interactive Map** - Mapbox with satellite/street view toggle
6. **Results Table** - Sortable, with copy address and Google Maps links
7. **Daily Quota** - Rate limiting (10 searches/day per user)
8. **Waitlist** - Unauthorized users can request access
9. **Admin Dashboard** - API usage stats, session invalidation

## Environment Variables

**Frontend (VITE_ prefix, exposed to browser):**
- `VITE_MAPBOX_TOKEN` - Mapbox public token (URL-restricted)

**Backend (Netlify Functions):**
- `MAPBOX_TOKEN` - Mapbox token for server-side geocoding (no URL restrictions)
- `RESEND_API_KEY` - Resend API key for emails
- `JWT_SECRET` - Secret for signing JWTs (must be secure)
- `JWT_VERSION` - Increment to invalidate all sessions
- `ALLOWED_EMAILS` - Comma-separated list of authorized users
- `ADMIN_EMAILS` - Comma-separated list of admin users
- `ADMIN_NOTIFICATION_EMAIL` - Where to send waitlist notifications

## Development Commands

```bash
# Install dependencies
npm install

# Run locally (frontend + functions)
netlify dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Testing

The project uses **Vitest** for testing. Tests are located in `netlify/functions/utils/court-utils.test.js`.

### Test Coverage
- **45 tests** covering court utility functions:
  - Distance calculations (`getDistance`)
  - Multi-family text detection (`isMultiFamilyText`)
  - Club text detection (`isClubText`)
  - Court classification (`classifyCourt`)
  - Address reclassification (`reclassifyWithAddress`)
  - Court clustering (`clusterCourts`)
  - Nearby feature detection (`findNearbyClub`, `findNearbyMultiFamily`)

### Pre-Push Hook
A **husky pre-push hook** automatically runs all tests before every `git push`. If any test fails, the push is aborted:

```
Running tests before push...
✓ netlify/functions/utils/court-utils.test.js (45 tests) 4ms
Tests passed! Proceeding with push.
```

This prevents broken code from being deployed to production.

## Important Patterns

### Court Classification Logic
Court classification is handled by `court-utils.js` with the following priority:

1. **OSM Tags** (most reliable):
   - `access=private` → Private Residential
   - `access=public/yes/permissive` → Public Facility
   - `access=members/customers` → Private Club
   - `building=apartments` → Multi-Family

2. **Keyword Detection**:
   - Club keywords: "club", "country", "tennis center", "racquet", "resort", "hotel"
   - Public keywords: "park", "school", "recreation", "municipal", "ymca"
   - Multi-family keywords: "apartment", "condo", "townhome", "villa", "residences"

3. **Nearby Feature Detection** (via additional Overpass queries):
   - Courts within 200m of a club feature (with "club" in name) → Club
   - Courts within 100m of an apartment building → Multi-Family

4. **Default**: If no indicators, defaults to "public (unverified)"

### Court Clustering
Multiple courts at the same location are clustered into a single result:
- **Public courts**: 50m clustering distance
- **Club courts**: 150m clustering distance (courts spread across property)
- **Private/Multi-family**: No clustering (different properties shouldn't merge)

### Reverse Geocoding Fallback Chain
1. Mapbox street address
2. OpenStreetMap Nominatim
3. Mapbox POI/place
4. Nominatim general
5. Mapbox general

### Map State Preservation
When toggling satellite/street view, map state is saved and restored with a setTimeout to override Mapbox animations.

### Dynamic Filter Counts
`withAddressCount` and `verifiedCount` in results store update dynamically based on active type filter.

## Email Configuration

Emails are sent via Resend from: `noreply@tennis-courts.fortylove.net`

This verified domain must be used for production. The `resend.dev` domain only works for sending to the account owner's email.

## Common Tasks

### Add a new authorized user
Add their email to `ALLOWED_EMAILS` in Netlify environment variables.

### Make someone an admin
Add their email to both `ALLOWED_EMAILS` and `ADMIN_EMAILS`.

### Invalidate all sessions
Increment `JWT_VERSION` in Netlify environment variables.

### Using GIT

## Code Commits
When commiting code to the respository, do not include any references to Claude in the git commit messages.

Do not stage, commit, or push code without first getting confirmation from the human user of Claude.

### Debug search issues
Check Netlify function logs for Overpass API errors. Multiple fallback endpoints are configured.

## Files Not in Git

These files contain sensitive info and are gitignored:
- `.env` - Local environment variables
- `.env.prod` - Local environment variables
- `instructions.md` - Original project requirements
- `TODO.md` - Future enhancement ideas

## Deployment

Push to main branch triggers automatic Netlify deployment. Environment variables must be set in Netlify dashboard for production.

