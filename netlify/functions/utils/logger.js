import { getStore } from '@netlify/blobs'

// Configuration
const CONFIG = {
  ROTATION_MONTHS: 3,        // Rotate logs every 3 months
  RETENTION_MONTHS: 18,      // Keep aggregate metrics for 18 months
  LOGS_STORE: 'usage-logs',
  METRICS_STORE: 'usage-metrics'
}

// Check if Blobs can be configured (either auto or manual)
function isBlobsAvailable() {
  // Auto context (new function format)
  if (process.env.NETLIFY_BLOBS_CONTEXT) {
    return true
  }
  // Manual config (legacy function format) - need site ID and token
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
    return true
  }
  return false
}

// Safely get a store, returns null if not available
function safeGetStore(name) {
  if (!isBlobsAvailable()) {
    return null
  }
  try {
    // If we have manual config, use it
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
      return getStore({
        name,
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN
      })
    }
    // Otherwise use auto context
    return getStore(name)
  } catch (error) {
    console.warn(`Blobs not available: ${error.message}`)
    return null
  }
}

// Get current period key (e.g., "2025-Q1")
function getCurrentPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = Math.ceil((now.getMonth() + 1) / CONFIG.ROTATION_MONTHS)
  return `${year}-Q${quarter}`
}

// Get period for a specific date
function getPeriodForDate(date) {
  const year = date.getFullYear()
  const quarter = Math.ceil((date.getMonth() + 1) / CONFIG.ROTATION_MONTHS)
  return `${year}-Q${quarter}`
}

// Get current day key (e.g., "2025-01-03")
function getCurrentDay() {
  return new Date().toISOString().split('T')[0]
}

// Log an event
export async function logEvent(event) {
  const store = safeGetStore(CONFIG.LOGS_STORE)

  // If blobs not available (local dev), just log to console
  if (!store) {
    console.log(`[LOG] ${event.action}: ${event.email}`, event)
    return
  }
  const period = getCurrentPeriod()
  const day = getCurrentDay()
  const key = `${period}/${day}`

  console.log(`[LOG] logEvent: Writing to key ${key}`)

  const entry = {
    timestamp: new Date().toISOString(),
    ...event
  }

  try {
    // Get existing logs for today
    let logs = []
    try {
      const existing = await store.get(key, { type: 'json' })
      if (existing) {
        logs = existing
        console.log(`[LOG] logEvent: Found ${logs.length} existing entries for ${key}`)
      }
    } catch (e) {
      // Key doesn't exist yet, start fresh
      console.log(`[LOG] logEvent: No existing entries for ${key}, starting fresh`)
    }

    // Append new entry
    logs.push(entry)

    // Save back
    await store.setJSON(key, logs)

    console.log(`[LOG] logEvent: Successfully saved ${logs.length} entries to ${key}`)
  } catch (error) {
    console.error('[LOG] logEvent: Failed to log event:', error)
    // Don't throw - logging should not break the app
  }
}

// Log a login event
export async function logLogin(email, success, ip = null) {
  await logEvent({
    action: 'login',
    email,
    success,
    ip
  })
}

// Log a search event
export async function logSearch(email, lat, lng, distance, resultCount) {
  await logEvent({
    action: 'search',
    email,
    lat,
    lng,
    distance,
    resultCount
  })
}

// Log a waitlist signup
export async function logWaitlist(email) {
  await logEvent({
    action: 'waitlist',
    email
  })
}

// Log admin action
export async function logAdminAction(email, action, details = {}) {
  await logEvent({
    action: `admin:${action}`,
    email,
    ...details
  })
}

// Get logs for a specific period
export async function getLogsForPeriod(period) {
  const store = safeGetStore(CONFIG.LOGS_STORE)
  if (!store) {
    console.log('[LOG] getLogsForPeriod: Blobs not available in local dev')
    return []
  }
  const logs = []

  try {
    const { blobs } = await store.list({ prefix: `${period}/` })

    for (const blob of blobs) {
      const dayLogs = await store.get(blob.key, { type: 'json' })
      if (dayLogs) {
        logs.push(...dayLogs)
      }
    }
  } catch (error) {
    console.error('Failed to get logs:', error)
  }

  return logs
}

// Get logs for current period
export async function getCurrentLogs() {
  return getLogsForPeriod(getCurrentPeriod())
}

// Get recent logs (last N days)
export async function getRecentLogs(days = 7) {
  const store = safeGetStore(CONFIG.LOGS_STORE)
  if (!store) {
    console.log('[LOG] getRecentLogs: Blobs not available in local dev')
    return []
  }
  const logs = []

  console.log(`[LOG] getRecentLogs: Fetching logs for last ${days} days`)

  // Generate keys for last N days - handle quarter boundaries
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dayKey = date.toISOString().split('T')[0]
    const period = getPeriodForDate(date) // Get correct period for each day
    const key = `${period}/${dayKey}`

    try {
      const dayLogs = await store.get(key, { type: 'json' })
      if (dayLogs) {
        console.log(`[LOG] Found ${dayLogs.length} logs for ${key}`)
        logs.push(...dayLogs)
      }
    } catch (e) {
      // Day doesn't exist, skip
      console.log(`[LOG] No logs for ${key}: ${e.message}`)
    }
  }

  console.log(`[LOG] getRecentLogs: Total ${logs.length} logs found`)
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

// Search logs by email
export async function searchLogsByEmail(email, periodOrDays = 30) {
  let logs
  if (typeof periodOrDays === 'string') {
    logs = await getLogsForPeriod(periodOrDays)
  } else {
    logs = await getRecentLogs(periodOrDays)
  }

  return logs.filter(log =>
    log.email && log.email.toLowerCase().includes(email.toLowerCase())
  )
}

// Search logs by action
export async function searchLogsByAction(action, days = 30) {
  const logs = await getRecentLogs(days)
  return logs.filter(log => log.action === action)
}

// Get aggregate metrics for a period
export async function getMetrics(period = null) {
  const store = safeGetStore(CONFIG.METRICS_STORE)
  if (!store) {
    console.log('[LOG] getMetrics: Blobs not available in local dev')
    return null
  }
  const key = period || getCurrentPeriod()

  try {
    const metrics = await store.get(key, { type: 'json' })
    return metrics || null
  } catch (e) {
    return null
  }
}

// Get all stored metrics periods
export async function getAllMetricsPeriods() {
  const store = safeGetStore(CONFIG.METRICS_STORE)
  if (!store) {
    console.log('[LOG] getAllMetricsPeriods: Blobs not available in local dev')
    return []
  }
  const periods = []

  try {
    const { blobs } = await store.list()
    for (const blob of blobs) {
      periods.push(blob.key)
    }
  } catch (error) {
    console.error('Failed to list metrics:', error)
  }

  return periods.sort().reverse()
}

// Calculate aggregate metrics from logs
export function calculateMetrics(logs) {
  const uniqueUsers = new Set()
  const dailySearches = {}
  const dailyLogins = {}
  const userSearchCounts = {}
  const searchLocations = []
  let totalSearches = 0
  let totalLogins = 0
  let totalResults = 0

  for (const log of logs) {
    if (log.email) {
      uniqueUsers.add(log.email.toLowerCase())
    }

    const day = log.timestamp.split('T')[0]

    if (log.action === 'search') {
      totalSearches++
      dailySearches[day] = (dailySearches[day] || 0) + 1
      userSearchCounts[log.email] = (userSearchCounts[log.email] || 0) + 1
      totalResults += log.resultCount || 0

      if (log.lat && log.lng) {
        searchLocations.push({ lat: log.lat, lng: log.lng })
      }
    }

    if (log.action === 'login' && log.success) {
      totalLogins++
      dailyLogins[day] = (dailyLogins[day] || 0) + 1
    }
  }

  // Find top users by search count
  const topUsers = Object.entries(userSearchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }))

  return {
    period: getCurrentPeriod(),
    generatedAt: new Date().toISOString(),
    uniqueUsers: uniqueUsers.size,
    totalSearches,
    totalLogins,
    totalResults,
    avgResultsPerSearch: totalSearches > 0 ? Math.round(totalResults / totalSearches) : 0,
    dailySearches,
    dailyLogins,
    topUsers,
    searchLocations: searchLocations.slice(0, 100) // Limit stored locations
  }
}

// Rotate logs - archive old period and generate metrics
export async function rotateLogs(period) {
  const logsStore = safeGetStore(CONFIG.LOGS_STORE)
  const metricsStore = safeGetStore(CONFIG.METRICS_STORE)

  if (!logsStore || !metricsStore) {
    console.log('[LOG] rotateLogs: Blobs not available in local dev')
    return null
  }

  console.log(`Rotating logs for period: ${period}`)

  // Get all logs for the period
  const logs = await getLogsForPeriod(period)

  if (logs.length === 0) {
    console.log('No logs to rotate')
    return null
  }

  // Calculate and store metrics
  const metrics = calculateMetrics(logs)
  metrics.period = period
  await metricsStore.setJSON(period, metrics)

  console.log(`Stored metrics for ${period}: ${logs.length} events, ${metrics.uniqueUsers} unique users`)

  // Delete old log entries
  const { blobs } = await logsStore.list({ prefix: `${period}/` })
  for (const blob of blobs) {
    await logsStore.delete(blob.key)
  }

  console.log(`Deleted ${blobs.length} log files for ${period}`)

  // Clean up old metrics beyond retention period
  await cleanupOldMetrics()

  return metrics
}

// Clean up metrics older than retention period
async function cleanupOldMetrics() {
  const store = safeGetStore(CONFIG.METRICS_STORE)
  if (!store) {
    return
  }
  const now = new Date()
  const cutoffDate = new Date(now.setMonth(now.getMonth() - CONFIG.RETENTION_MONTHS))
  const cutoffYear = cutoffDate.getFullYear()
  const cutoffQuarter = Math.ceil((cutoffDate.getMonth() + 1) / 3)
  const cutoffPeriod = `${cutoffYear}-Q${cutoffQuarter}`

  try {
    const { blobs } = await store.list()
    for (const blob of blobs) {
      if (blob.key < cutoffPeriod) {
        console.log(`Deleting old metrics: ${blob.key}`)
        await store.delete(blob.key)
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old metrics:', error)
  }
}

// Get dashboard summary
export async function getDashboardSummary() {
  console.log('[LOG] getDashboardSummary: Starting')
  console.log('[LOG] getDashboardSummary: isBlobsAvailable =', isBlobsAvailable())
  console.log('[LOG] getDashboardSummary: NETLIFY =', process.env.NETLIFY)
  console.log('[LOG] getDashboardSummary: NETLIFY_BLOBS_CONTEXT exists =', !!process.env.NETLIFY_BLOBS_CONTEXT)

  const recentLogs = await getRecentLogs(30)
  console.log('[LOG] getDashboardSummary: Got', recentLogs.length, 'recent logs')

  const currentMetrics = calculateMetrics(recentLogs)
  const historicalPeriods = await getAllMetricsPeriods()

  // Get historical metrics
  const historicalMetrics = []
  for (const period of historicalPeriods.slice(0, 6)) { // Last 6 periods
    const metrics = await getMetrics(period)
    if (metrics) {
      historicalMetrics.push(metrics)
    }
  }

  return {
    current: currentMetrics,
    historical: historicalMetrics,
    recentActivity: recentLogs.slice(0, 50) // Last 50 events
  }
}

export { CONFIG }
