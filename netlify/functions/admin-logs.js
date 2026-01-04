import { verifySessionToken, getSessionFromCookies, isAdmin } from './utils/auth.js'
import { jsonResponse, errorResponse } from './utils/response.js'
import {
  getDashboardSummary,
  getRecentLogs,
  searchLogsByEmail,
  searchLogsByAction,
  getMetrics,
  getAllMetricsPeriods,
  getLogsForPeriod
} from './utils/logger.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  // Verify authentication and admin status
  const sessionToken = getSessionFromCookies(event.headers.cookie)
  if (!sessionToken) {
    return errorResponse('Authentication required', 401)
  }

  let email
  try {
    const session = await verifySessionToken(sessionToken)
    email = session.email
  } catch (error) {
    return errorResponse('Invalid session', 401)
  }

  if (!isAdmin(email)) {
    return errorResponse('Admin access required', 403)
  }

  try {
    const url = new URL(event.rawUrl)
    const action = url.searchParams.get('action') || 'dashboard'

    switch (action) {
      case 'dashboard': {
        // Get full dashboard summary
        const summary = await getDashboardSummary()
        return jsonResponse(summary)
      }

      case 'recent': {
        // Get recent logs
        const days = parseInt(url.searchParams.get('days') || '7')
        const logs = await getRecentLogs(days)
        return jsonResponse({ logs, count: logs.length })
      }

      case 'search-email': {
        // Search logs by email
        const searchEmail = url.searchParams.get('email')
        if (!searchEmail) {
          return errorResponse('Email parameter required')
        }
        const days = parseInt(url.searchParams.get('days') || '30')
        const logs = await searchLogsByEmail(searchEmail, days)
        return jsonResponse({ logs, count: logs.length, searchEmail })
      }

      case 'search-action': {
        // Search logs by action type
        const actionType = url.searchParams.get('type')
        if (!actionType) {
          return errorResponse('Type parameter required')
        }
        const days = parseInt(url.searchParams.get('days') || '30')
        const logs = await searchLogsByAction(actionType, days)
        return jsonResponse({ logs, count: logs.length, actionType })
      }

      case 'metrics': {
        // Get metrics for a specific period
        const period = url.searchParams.get('period')
        const metrics = await getMetrics(period)
        return jsonResponse({ metrics, period })
      }

      case 'periods': {
        // Get list of available metric periods
        const periods = await getAllMetricsPeriods()
        return jsonResponse({ periods })
      }

      case 'period-logs': {
        // Get all logs for a specific period
        const period = url.searchParams.get('period')
        if (!period) {
          return errorResponse('Period parameter required')
        }
        const logs = await getLogsForPeriod(period)
        return jsonResponse({ logs, count: logs.length, period })
      }

      default:
        return errorResponse('Unknown action: ' + action)
    }
  } catch (error) {
    console.error('Admin logs error:', error)
    return errorResponse('Failed to get logs: ' + error.message, 500)
  }
}
