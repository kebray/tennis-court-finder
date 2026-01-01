// Standard JSON response
export function jsonResponse(data, statusCode = 200, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(data)
  }
}

// Error response
export function errorResponse(message, statusCode = 400) {
  return jsonResponse({ error: message }, statusCode)
}

// Success response with cookie
export function successWithCookie(data, cookie, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie
    },
    body: JSON.stringify(data)
  }
}

// Parse JSON body from event
export function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}')
  } catch {
    return {}
  }
}
