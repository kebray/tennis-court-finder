// Simple in-memory storage for development
// In production, this would use Netlify Blobs or a database

// Note: This is a simplified implementation. In production with Netlify,
// you would use @netlify/blobs for persistent storage across function invocations.

const storage = {
  waitlist: [],
  quotas: {},
  apiUsage: {
    mapbox: { geocoding: { used: 0 }, mapLoads: { used: 0 } },
    overpass: { requestsToday: 0, lastReset: new Date().toDateString() },
    resend: { sent: 0 }
  }
}

// Waitlist functions
export function addToWaitlist(email) {
  const normalized = email.toLowerCase().trim()
  if (!storage.waitlist.includes(normalized)) {
    storage.waitlist.push(normalized)
  }
  return true
}

export function getWaitlist() {
  return [...storage.waitlist]
}

// Quota functions
export function getQuota(email) {
  const normalized = email.toLowerCase()
  const today = new Date().toDateString()

  if (!storage.quotas[normalized] || storage.quotas[normalized].date !== today) {
    storage.quotas[normalized] = {
      date: today,
      used: 0,
      limit: 10
    }
  }

  return storage.quotas[normalized]
}

export function incrementQuota(email) {
  const quota = getQuota(email)
  quota.used++
  return quota
}

export function canUseQuota(email) {
  const quota = getQuota(email)
  return quota.used < quota.limit
}

// API usage tracking
export function trackApiUsage(api, type = 'request') {
  const today = new Date().toDateString()

  // Reset daily counters if needed
  if (storage.apiUsage.overpass.lastReset !== today) {
    storage.apiUsage.overpass.requestsToday = 0
    storage.apiUsage.overpass.lastReset = today
  }

  switch (api) {
    case 'mapbox-geocoding':
      storage.apiUsage.mapbox.geocoding.used++
      break
    case 'mapbox-maps':
      storage.apiUsage.mapbox.mapLoads.used++
      break
    case 'overpass':
      storage.apiUsage.overpass.requestsToday++
      break
    case 'resend':
      storage.apiUsage.resend.sent++
      break
  }
}

export function getApiUsage() {
  return {
    mapbox: {
      geocoding: {
        used: storage.apiUsage.mapbox.geocoding.used,
        limit: 100000 // Mapbox free tier
      },
      mapLoads: {
        used: storage.apiUsage.mapbox.mapLoads.used,
        limit: 50000 // Mapbox free tier
      }
    },
    overpass: {
      requestsToday: storage.apiUsage.overpass.requestsToday
    },
    resend: {
      sent: storage.apiUsage.resend.sent,
      limit: 3000 // Resend free tier
    }
  }
}
