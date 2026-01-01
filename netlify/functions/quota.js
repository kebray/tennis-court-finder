import { verifySessionToken, getSessionFromCookies } from './utils/auth.js'
import { jsonResponse, errorResponse } from './utils/response.js'
import { getQuota } from './utils/storage.js'

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
    const { email } = await verifySessionToken(sessionToken)
    const quota = getQuota(email)

    return jsonResponse({
      used: quota.used,
      limit: quota.limit,
      resetTime: 'midnight UTC'
    })
  } catch (error) {
    return errorResponse('Invalid session', 401)
  }
}
