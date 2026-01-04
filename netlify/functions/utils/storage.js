import { getStore } from '@netlify/blobs'

// Configuration for Blobs
const STORE_NAME = 'app-storage'

// Check if Blobs can be configured
function isBlobsAvailable() {
  if (process.env.NETLIFY_BLOBS_CONTEXT) return true
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) return true
  return false
}

// Get store with manual config if needed
function getStoreSafe() {
  if (!isBlobsAvailable()) return null
  try {
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
      return getStore({
        name: STORE_NAME,
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN
      })
    }
    return getStore(STORE_NAME)
  } catch (error) {
    console.warn('Blobs not available:', error.message)
    return null
  }
}

// In-memory fallback for local dev
const storage = {
  waitlist: [],
  quotas: {},
  apiUsage: {
    mapbox: { geocoding: { used: 0 }, mapLoads: { used: 0 } },
    overpass: { requestsToday: 0, lastReset: new Date().toDateString() },
    resend: { sent: 0, lastReset: new Date().toISOString().slice(0, 7) }
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

// API usage tracking keys
const API_USAGE_KEY = 'api-usage'

// Get current month key (e.g., "2026-01")
function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

// Get today's date key
function getToday() {
  return new Date().toDateString()
}

// Get stored API usage or initialize
async function getStoredApiUsage() {
  const store = getStoreSafe()
  if (!store) {
    return null
  }

  try {
    const data = await store.get(API_USAGE_KEY, { type: 'json' })
    return data
  } catch (e) {
    return null
  }
}

// Save API usage
async function saveApiUsage(usage) {
  const store = getStoreSafe()
  if (!store) return

  try {
    await store.setJSON(API_USAGE_KEY, usage)
  } catch (e) {
    console.error('Failed to save API usage:', e)
  }
}

// API usage tracking (now async)
export async function trackApiUsage(api, type = 'request') {
  const store = getStoreSafe()

  // Fallback to in-memory for local dev
  if (!store) {
    const today = getToday()
    if (storage.apiUsage.overpass.lastReset !== today) {
      storage.apiUsage.overpass.requestsToday = 0
      storage.apiUsage.overpass.lastReset = today
    }
    switch (api) {
      case 'mapbox-geocoding': storage.apiUsage.mapbox.geocoding.used++; break
      case 'mapbox-maps': storage.apiUsage.mapbox.mapLoads.used++; break
      case 'overpass': storage.apiUsage.overpass.requestsToday++; break
      case 'resend': storage.apiUsage.resend.sent++; break
    }
    return
  }

  // Use persistent storage
  const today = getToday()
  const month = getCurrentMonth()

  let usage = await getStoredApiUsage()

  // Initialize if needed
  if (!usage) {
    usage = {
      mapbox: { geocoding: { used: 0, month }, mapLoads: { used: 0, month } },
      overpass: { requestsToday: 0, lastReset: today },
      resend: { sent: 0, month }
    }
  }

  // Reset monthly counters if month changed
  if (usage.mapbox.geocoding.month !== month) {
    usage.mapbox.geocoding = { used: 0, month }
  }
  if (usage.mapbox.mapLoads.month !== month) {
    usage.mapbox.mapLoads = { used: 0, month }
  }
  if (usage.resend.month !== month) {
    usage.resend = { sent: 0, month }
  }

  // Reset daily counters if day changed
  if (usage.overpass.lastReset !== today) {
    usage.overpass = { requestsToday: 0, lastReset: today }
  }

  // Increment appropriate counter
  switch (api) {
    case 'mapbox-geocoding': usage.mapbox.geocoding.used++; break
    case 'mapbox-maps': usage.mapbox.mapLoads.used++; break
    case 'overpass': usage.overpass.requestsToday++; break
    case 'resend': usage.resend.sent++; break
  }

  await saveApiUsage(usage)
}

// Get API usage (now async)
export async function getApiUsage() {
  const store = getStoreSafe()

  // Fallback to in-memory for local dev
  if (!store) {
    return {
      mapbox: {
        geocoding: { used: storage.apiUsage.mapbox.geocoding.used, limit: 100000 },
        mapLoads: { used: storage.apiUsage.mapbox.mapLoads.used, limit: 50000 }
      },
      overpass: { requestsToday: storage.apiUsage.overpass.requestsToday },
      resend: { sent: storage.apiUsage.resend.sent, limit: 3000 }
    }
  }

  const usage = await getStoredApiUsage()
  const today = getToday()
  const month = getCurrentMonth()

  // Return with defaults if no data
  if (!usage) {
    return {
      mapbox: {
        geocoding: { used: 0, limit: 100000 },
        mapLoads: { used: 0, limit: 50000 }
      },
      overpass: { requestsToday: 0 },
      resend: { sent: 0, limit: 3000 }
    }
  }

  return {
    mapbox: {
      geocoding: {
        used: usage.mapbox?.geocoding?.month === month ? usage.mapbox.geocoding.used : 0,
        limit: 100000
      },
      mapLoads: {
        used: usage.mapbox?.mapLoads?.month === month ? usage.mapbox.mapLoads.used : 0,
        limit: 50000
      }
    },
    overpass: {
      requestsToday: usage.overpass?.lastReset === today ? usage.overpass.requestsToday : 0
    },
    resend: {
      sent: usage.resend?.month === month ? usage.resend.sent : 0,
      limit: 3000
    }
  }
}
