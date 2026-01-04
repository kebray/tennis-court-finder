import { verifySessionToken, getSessionFromCookies, isAdmin } from './utils/auth.js'
import { jsonResponse, errorResponse } from './utils/response.js'
import { rotateLogs, logAdminAction, CONFIG } from './utils/logger.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
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
    // Get the period to rotate from query params or calculate previous period
    const url = new URL(event.rawUrl)
    let period = url.searchParams.get('period')

    if (!period) {
      // Calculate previous period
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Go back one quarter
      let prevQuarter = Math.ceil((currentMonth + 1) / CONFIG.ROTATION_MONTHS) - 1
      let prevYear = currentYear

      if (prevQuarter < 1) {
        prevQuarter = 4
        prevYear--
      }

      period = `${prevYear}-Q${prevQuarter}`
    }

    // Perform rotation
    const metrics = await rotateLogs(period)

    // Log admin action
    await logAdminAction(email, 'rotate-logs', { period })

    if (metrics) {
      return jsonResponse({
        success: true,
        message: `Rotated logs for ${period}`,
        metrics
      })
    } else {
      return jsonResponse({
        success: true,
        message: `No logs to rotate for ${period}`
      })
    }
  } catch (error) {
    console.error('Log rotation error:', error)
    return errorResponse('Failed to rotate logs: ' + error.message, 500)
  }
}
