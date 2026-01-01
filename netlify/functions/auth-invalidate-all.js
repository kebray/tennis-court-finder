import { verifySessionToken, getSessionFromCookies, clearSessionCookie } from './utils/auth.js'
import { jsonResponse, errorResponse, successWithCookie } from './utils/response.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const sessionToken = getSessionFromCookies(event.headers.cookie)

  if (!sessionToken) {
    return errorResponse('Authentication required', 401)
  }

  try {
    const { isAdmin } = await verifySessionToken(sessionToken)

    if (!isAdmin) {
      return errorResponse('Admin access required', 403)
    }

    // To invalidate all tokens, you would increment JWT_VERSION in Netlify environment variables
    // This is a manual process since environment variables can't be changed at runtime
    //
    // For this demo, we'll return instructions to the admin
    //
    // In a production system, you might:
    // 1. Store JWT_VERSION in a database
    // 2. Use a token blacklist
    // 3. Use short-lived tokens with refresh tokens

    const cookie = clearSessionCookie()

    return successWithCookie({
      success: true,
      message: 'To complete token invalidation, increment JWT_VERSION in Netlify environment variables. Your session has been cleared.',
      instructions: [
        '1. Go to Netlify Dashboard > Site Settings > Environment Variables',
        '2. Find JWT_VERSION and increment its value (e.g., 1 -> 2)',
        '3. Trigger a new deploy to apply the change',
        '4. All existing tokens will be invalidated'
      ]
    }, cookie)
  } catch (error) {
    console.error('Invalidate error:', error)
    return errorResponse(error.message || 'Failed to invalidate tokens', 500)
  }
}
