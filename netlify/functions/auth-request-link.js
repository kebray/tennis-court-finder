import { isEmailAllowed, createMagicToken } from './utils/auth.js'
import { jsonResponse, errorResponse, parseBody } from './utils/response.js'
import { trackApiUsage } from './utils/storage.js'
import { logLogin } from './utils/logger.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const { email } = parseBody(event)

  if (!email || !email.includes('@')) {
    return errorResponse('Valid email required')
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check if email is allowed
  if (!isEmailAllowed(normalizedEmail)) {
    // Log failed login attempt (not on allowed list)
    await logLogin(normalizedEmail, false, event.headers['x-forwarded-for'] || event.headers['client-ip'])
    return jsonResponse({ success: false, notAllowed: true }, 403)
  }

  try {
    // Create magic link token
    const token = await createMagicToken(normalizedEmail)

    // Build verification URL
    const baseUrl = process.env.URL || 'http://localhost:8888'
    const verifyUrl = `${baseUrl}/verify?token=${token}`

    // In development, log the magic link for easy testing
    if (!process.env.URL || process.env.URL.includes('localhost')) {
      console.log('\n========================================')
      console.log('DEV MODE: Magic link for', normalizedEmail)
      console.log('Click here to login:', verifyUrl)
      console.log('========================================\n')
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Tennis Court Finder <noreply@tennis-courts.fortylove.net>',
        to: normalizedEmail,
        subject: 'Sign in to Tennis Court Finder',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Tennis Court Finder</h1>
            <p>Click the button below to sign in to your account. This link will expire in 15 minutes.</p>
            <a href="${verifyUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Sign In
            </a>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this email, you can safely ignore it.
            </p>
            <p style="color: #666; font-size: 12px;">
              Or copy and paste this link: ${verifyUrl}
            </p>
          </div>
        `
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Resend error:', JSON.stringify(error, null, 2))
      console.error('Attempted to send to:', normalizedEmail)
      return errorResponse(`Failed to send email: ${error.message || JSON.stringify(error)}`, 500)
    }

    console.log('Email sent successfully to:', normalizedEmail)

    await trackApiUsage('resend')

    // Log successful login request
    await logLogin(normalizedEmail, true, event.headers['x-forwarded-for'] || event.headers['client-ip'])

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Auth request error:', error)
    return errorResponse('Internal server error', 500)
  }
}
