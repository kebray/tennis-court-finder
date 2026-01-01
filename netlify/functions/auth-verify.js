import { verifyMagicToken, createSessionToken, createSessionCookie, isEmailAdmin } from './utils/auth.js'
import { jsonResponse, errorResponse, parseBody, successWithCookie } from './utils/response.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const { token } = parseBody(event)

  if (!token) {
    return errorResponse('Token required')
  }

  try {
    // Verify the magic link token
    const { email } = await verifyMagicToken(token)

    // Create a session token
    const sessionToken = await createSessionToken(email)

    // Set cookie and return success
    const cookie = createSessionCookie(sessionToken)

    return successWithCookie({
      success: true,
      email,
      isAdmin: isEmailAdmin(email)
    }, cookie)
  } catch (error) {
    console.error('Verify error:', error)
    return errorResponse(error.message || 'Verification failed', 401)
  }
}
