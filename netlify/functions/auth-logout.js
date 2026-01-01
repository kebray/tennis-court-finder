import { clearSessionCookie } from './utils/auth.js'
import { successWithCookie, errorResponse } from './utils/response.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const cookie = clearSessionCookie()

  return successWithCookie({ success: true }, cookie)
}
