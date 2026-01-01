import { verifySessionToken, getSessionFromCookies } from './utils/auth.js'
import { jsonResponse, errorResponse } from './utils/response.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  const sessionToken = getSessionFromCookies(event.headers.cookie)

  if (!sessionToken) {
    return jsonResponse({ authenticated: false }, 200)
  }

  try {
    const { email, isAdmin } = await verifySessionToken(sessionToken)

    return jsonResponse({
      authenticated: true,
      email,
      isAdmin
    })
  } catch (error) {
    return jsonResponse({ authenticated: false }, 200)
  }
}
