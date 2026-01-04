# Tennis Court Finder - Development Plan

> **Note**: This is the sanitized version of the development plan. All API keys and sensitive values have been replaced with placeholders. See `instructions.md` (gitignored) for actual values.

## Executive Summary
A Vue.js 3 web application that helps users find tennis courts in their area. The app searches OpenStreetMap data for tennis courts within a specified driving distance and provides addresses. Users must ensure they have permission to play at any courts before visiting the properties.

---

## Architecture Overview

### Technology Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Vue.js 3 + Vite | Modern, fast, SPA requirement |
| Styling | Tailwind CSS | Rapid UI development |
| Maps | Mapbox GL JS | Token already provided, excellent satellite imagery, free tier |
| Backend | Netlify Functions | Serverless, deploys with frontend, handles auth securely |
| Email | Resend API | API key provided |
| Data Storage | Browser localStorage + Netlify KV/Blob | Session data local, auth data server-side |

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Vue.js 3 SPA                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Auth    │ │  Search  │ │   Map    │ │ Results/Export   │   │
│  │  Views   │ │  Input   │ │  Widget  │ │    Component     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Netlify Functions                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Auth    │ │  Rate    │ │ Waitlist │ │ Tennis Court     │   │
│  │  (JWT)   │ │ Limiting │ │ Handler  │ │ Search Proxy     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External APIs                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ OpenStreetMap│ │   Mapbox     │ │      Resend          │    │
│  │ Overpass API │ │ Geocoding    │ │    (Email)           │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tennis Court Detection Strategy

### Recommended Approach: OpenStreetMap Overpass API (Primary)

**Why this approach:**
1. **Free & Unlimited**: No API costs
2. **Pre-tagged Data**: Community has already tagged thousands of tennis courts with `leisure=pitch` + `sport=tennis`
3. **Includes Metadata**: Often has `access=private/public`, `ownership`, and sometimes address info
4. **Reliable**: Production-ready API with multiple public endpoints

**How it works:**
1. User enters starting address → Mapbox Geocoding converts to lat/long
2. Calculate bounding box or use Mapbox Isochrone for driving distance polygon
3. Query Overpass API for all tennis courts within that area
4. Cross-reference with reverse geocoding to get street addresses

### Court Classification Logic
| Source Data | Classification |
|-------------|----------------|
| `access=private` + residential area | **Private Residential** |
| `access=private` + apartment/condo keywords | **Multi-Family** |
| `building=apartments` nearby | **Multi-Family** |
| `access=public` or `leisure=sports_centre` | **Public Facility** |
| `access=members` or tagged as club | **Private Club** |
| Within 200m of feature with "club" in name | **Private Club** |
| Residential zoning + no commercial tags | **Likely Private Residential** |

### Verification Strategy

1. **Cross-reference with OpenStreetMap building data** - check if tennis court is within a residential parcel
2. **Google Places API (optional add-on)** - can verify if an address is a business vs residence
3. **User confirmation** - allow users to manually verify/flag courts they visit

**Verification Status Levels:**
- **Verified**: OpenStreetMap data explicitly marks as residential
- **Likely Residential**: Located in residential zone, not near commercial buildings
- **Unverified**: Requires manual confirmation

---

## Feature Breakdown

### Phase 1: Core Application

#### 1.1 Authentication System
- Magic link email login via Resend API
- JWT tokens stored in httpOnly cookies (secure)
- Server-side whitelist in Netlify environment variables (encrypted)
- Admin detection for youremail@gmail.com

**Endpoints:**
- `POST /api/auth/request-magic-link` - Send login email
- `GET /api/auth/verify` - Verify magic link token, issue JWT
- `POST /api/auth/logout` - Clear session
- `POST /api/auth/invalidate-all` (admin only) - Revoke all tokens

#### 1.2 Waitlist System
- Collect email from unauthorized users
- Store in Netlify Blob storage (persists across deployments)
- Email notification to admin (youremail+tenniscourtfinder@gmail.com)

#### 1.3 Search Functionality
- Input: Starting address/zipcode
- Input: Maximum driving distance (miles)
- Output: List of tennis court locations with addresses

#### 1.4 Map Component
- Interactive Mapbox GL JS map
- Toggle satellite/street view
- Markers for each tennis court location
- Color-coded by classification (private = green, multi-family = purple, public = blue, club = orange)
- Click marker for address details

#### 1.5 Results Display
- Table/list view of all found addresses
- Columns: Address, Type (Private/Public/Club), Verification Status, Distance
- Sort and filter capabilities
- CSV export button
- Copy all addresses to clipboard button

#### 1.6 Rate Limiting & Usage Tracking
- Daily quota: 10 searches per user (configurable)
- Display: "X of Y searches remaining today"
- Reset at midnight UTC
- Stored per-user in Netlify KV store

**Admin API Usage Dashboard (youremail@gmail.com):**
The admin user will see a detailed breakdown of third-party API usage, including:
- Mapbox Geocoding API: requests used / monthly limit
- Mapbox Map Loads: loads used / monthly limit
- Overpass API: requests today (fair use monitoring)
- Resend Email API: emails sent / monthly limit

This dashboard will be visible in the Admin Panel and will help monitor when approaching free tier limits.

#### 1.7 Terms of Use
- Modal on first visit requiring acceptance
- Legal disclaimer protecting you from liability
- Stored acceptance in localStorage + server-side

---

## Security Measures

1. **API Key Protection**: All sensitive API keys stored in Netlify environment variables, never exposed to frontend
2. **Email Whitelist**: Stored server-side, not in client bundle
3. **JWT Security**:
   - Short expiration (24 hours)
   - Signed with secure secret
   - Token version tracking for mass invalidation
4. **Rate Limiting**: Server-side enforcement, not bypassable
5. **Input Validation**: All user inputs sanitized
6. **CORS**: Configured to only allow requests from your domain

---

## Git Ignore Strategy

The following files will be excluded from version control via `.gitignore`:

```gitignore
# Environment & Secrets
.env
.env.local
.env.*.local

# Local documentation with secrets
instructions.md

# Dependencies
node_modules/

# Build output
dist/
.netlify/

# IDE & OS
.DS_Store
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*

# Local Netlify folder
.netlify
```

### Handling Sensitive Documentation

| File | Contains Secrets? | In Repo? | Purpose |
|------|-------------------|----------|---------|
| `instructions.md` | Yes (API keys) | No (gitignored) | Your original requirements - keep locally |
| `plan.md` | **Will be sanitized** | Yes | Development plan - keys replaced with placeholders |
| `.env` | Yes | No (gitignored) | Runtime secrets |
| `.env.example` | No (placeholders only) | Yes | Template showing required env vars |
| `SETUP-INSTRUCTIONS.md` | No | Yes | One-time setup guide |
| `README.md` | No | Yes | General documentation |

**Before first commit**, I will:
1. Replace all actual API keys in `plan.md` with placeholders (e.g., `<YOUR_RESEND_API_KEY>`)
2. Add a note at the top of `plan.md` indicating it's the sanitized version
3. Ensure `instructions.md` is in `.gitignore`

This way you keep full documentation in the repo for future reference, without exposing any secrets.

---

## File Structure
```
tenniscourtfinder/
├── netlify/
│   └── functions/
│       ├── auth-request-link.js
│       ├── auth-verify.js
│       ├── auth-logout.js
│       ├── auth-invalidate-all.js
│       ├── search-courts.js
│       ├── waitlist-add.js
│       └── rate-limit-check.js
├── src/
│   ├── components/
│   │   ├── MapView.vue
│   │   ├── SearchForm.vue
│   │   ├── ResultsTable.vue
│   │   ├── LoginForm.vue
│   │   ├── WaitlistForm.vue
│   │   ├── AdminPanel.vue
│   │   ├── QuotaDisplay.vue
│   │   └── TermsModal.vue
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── LoginView.vue
│   │   ├── VerifyView.vue
│   │   └── AboutView.vue
│   ├── stores/
│   │   ├── auth.js
│   │   ├── search.js
│   │   └── results.js
│   ├── utils/
│   │   ├── api.js
│   │   ├── export.js
│   │   └── geocoding.js
│   ├── App.vue
│   ├── main.js
│   └── router.js
├── public/
├── .env.example
├── netlify.toml
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## Environment Variables Required

### Netlify Environment Variables (Server-side, secure)
```
RESEND_API_KEY=<YOUR_RESEND_API_KEY>
JWT_SECRET=<GENERATE_SECURE_RANDOM_STRING_32_CHARS_MIN>
JWT_VERSION=1
ALLOWED_EMAILS=<COMMA_SEPARATED_ALLOWED_EMAILS>
ADMIN_EMAILS=<COMMA_SEPARATED_ADMIN_EMAILS>
ADMIN_NOTIFICATION_EMAIL=<YOUR_NOTIFICATION_EMAIL>
```

### Frontend Environment Variables (Public, in .env)
```
VITE_MAPBOX_TOKEN=<YOUR_MAPBOX_PUBLIC_TOKEN>
```

---

## API Costs Analysis

| Service | Free Tier | Expected Usage | Monthly Cost |
|---------|-----------|----------------|--------------|
| Mapbox | 50,000 map loads, 100,000 geocoding requests | Low (personal use) | $0 |
| OpenStreetMap Overpass | Unlimited (fair use) | Moderate | $0 |
| Resend | 3,000 emails/month | ~10-50 emails | $0 |
| Netlify | 125k function invocations | Low | $0 |

**Total Expected Monthly Cost: $0** (within free tiers)

---

## Source Control & Deployment

### GitHub Repository
The source code will be hosted on GitHub. I will generate all code locally, and provide a separate file called `SETUP-INSTRUCTIONS.md` with detailed one-time instructions for:

1. Initializing the local Git repository
2. Creating the remote repository on GitHub
3. Pushing the initial code to GitHub
4. Connecting the GitHub repo to Netlify

**Note**: You will create the GitHub repository manually following my instructions. I will not create the remote repository programmatically.

### Deployment to Netlify (Preview)

Will be detailed in `README.md` and `SETUP-INSTRUCTIONS.md`, but high-level:

1. Create GitHub repository (per setup instructions)
2. Push code to GitHub
3. Connect to Netlify via GitHub integration
4. Configure environment variables in Netlify dashboard
5. Deploy automatically on push

---

## Implementation Order

1. **Project Setup** - Vue.js 3 + Vite + Tailwind + Netlify config
2. **Authentication** - Magic link flow + JWT + whitelist
3. **Basic UI Shell** - Layout, routing, login/logout
4. **Map Integration** - Mapbox GL JS with satellite toggle
5. **Search Backend** - Overpass API integration + geocoding
6. **Results Display** - Table, markers, classification
7. **Export Features** - CSV download, clipboard copy
8. **Rate Limiting** - Daily quota system
9. **Admin Features** - Token invalidation panel
10. **Waitlist** - Unauthorized user email collection
11. **Terms of Use** - Legal modal
12. **Testing** - Vitest test suite with pre-push hooks
13. **Documentation** - README with deploy instructions

## Testing Strategy

The project uses **Vitest** for unit testing court utility functions. A **husky pre-push hook** ensures all tests pass before code can be pushed to the repository.

### What's Tested
- Distance calculations
- Court classification logic
- Multi-family detection keywords
- Club detection keywords
- Court clustering algorithms
- Nearby feature association

### Running Tests
```bash
npm test          # Run once
npm run test:watch # Watch mode
```

---

## Data Coverage Transparency

**Address Accuracy Note**: OpenStreetMap data quality varies by region. In well-mapped urban areas, most tennis courts are tagged. In rural areas, coverage may be sparse.

**How this will be communicated to users:**

1. **Search Form Info Icon**: A small info icon (ℹ️) next to the search button will display a tooltip on hover:
   > "Results are based on OpenStreetMap community data. Coverage is best in metropolitan areas and may be limited in rural regions."

2. **Results Header**: When search results are displayed, a subtle banner will appear:
   > "Found X tennis courts. Note: Data coverage varies by region—metro areas typically have more complete data."

3. **About Page**: A dedicated "About" page (accessible from the footer) will include a "Data Sources & Limitations" section explaining:
   - Where the data comes from (OpenStreetMap)
   - Why metro areas have better coverage
   - How users can contribute to OpenStreetMap to improve data
   - Disclaimer that results should be verified before sending letters

This approach ensures users are informed without being intrusive—the tooltip catches curious users, the results banner provides context when it matters most, and the About page offers full transparency for those who want details.

**Future Enhancement**: If rural coverage proves insufficient, satellite imagery analysis could be added as a Phase 2 feature.

---

## Ready to Proceed?

Please review this plan and let me know:
1. If you approve the overall approach
2. If you'd like any modifications
3. Any additional requirements I may have missed

Once approved, I will begin implementation immediately.
