import * as jose from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-change-in-production')
const JWT_ISSUER = 'tennis-court-finder'
const JWT_AUDIENCE = 'tennis-court-finder-users'

// Get allowed emails from environment
export function getAllowedEmails() {
  const emails = process.env.ALLOWED_EMAILS || ''
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

// Get admin emails from environment
export function getAdminEmails() {
  const emails = process.env.ADMIN_EMAILS || ''
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

// Check if email is allowed
export function isEmailAllowed(email) {
  const allowed = getAllowedEmails()
  return allowed.includes(email.toLowerCase())
}

// Check if email is admin
export function isEmailAdmin(email) {
  const admins = getAdminEmails()
  return admins.includes(email.toLowerCase())
}

// Alias for isEmailAdmin
export const isAdmin = isEmailAdmin

// Get current JWT version (for mass invalidation)
export function getJwtVersion() {
  return parseInt(process.env.JWT_VERSION || '1', 10)
}

// Create a magic link token (short-lived, for email verification)
export async function createMagicToken(email) {
  const token = await new jose.SignJWT({ email: email.toLowerCase(), type: 'magic' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('15m') // 15 minutes
    .sign(JWT_SECRET)

  return token
}

// Verify a magic link token
export async function verifyMagicToken(token) {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    })

    if (payload.type !== 'magic') {
      throw new Error('Invalid token type')
    }

    return { email: payload.email }
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

// Create a session JWT (longer-lived, for authenticated sessions)
export async function createSessionToken(email) {
  const version = getJwtVersion()

  const token = await new jose.SignJWT({
    email: email.toLowerCase(),
    type: 'session',
    isAdmin: isEmailAdmin(email),
    version
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('24h') // 24 hours
    .sign(JWT_SECRET)

  return token
}

// Verify a session token
export async function verifySessionToken(token) {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    })

    if (payload.type !== 'session') {
      throw new Error('Invalid token type')
    }

    // Check version for mass invalidation
    const currentVersion = getJwtVersion()
    if (payload.version !== currentVersion) {
      throw new Error('Token has been invalidated')
    }

    return {
      email: payload.email,
      isAdmin: payload.isAdmin
    }
  } catch (error) {
    throw new Error('Invalid or expired session')
  }
}

// Parse session token from cookies
export function getSessionFromCookies(cookieHeader) {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {})

  return cookies['session'] || null
}

// Create cookie header for session
export function createSessionCookie(token, maxAge = 86400) {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  return `session=${token}; HttpOnly; ${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

// Create cookie header to clear session
export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  return `session=; HttpOnly; ${secure} SameSite=Strict; Path=/; Max-Age=0`
}
