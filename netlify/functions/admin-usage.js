import { verifySessionToken, getSessionFromCookies } from './utils/auth.js'
import { jsonResponse, errorResponse } from './utils/response.js'
import { getApiUsage } from './utils/storage.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  // Verify authentication
  const sessionToken = getSessionFromCookies(event.headers.cookie)
  if (!sessionToken) {
    return errorResponse('Authentication required', 401)
  }

  try {
    const { isAdmin } = await verifySessionToken(sessionToken)

    if (!isAdmin) {
      return errorResponse('Admin access required', 403)
    }

    const usage = getApiUsage()

    return jsonResponse(usage)
  } catch (error) {
    return errorResponse('Invalid session', 401)
  }
}
