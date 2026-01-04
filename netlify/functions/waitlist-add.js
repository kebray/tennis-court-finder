import { jsonResponse, errorResponse, parseBody } from './utils/response.js'
import { addToWaitlist, trackApiUsage } from './utils/storage.js'
import { logWaitlist } from './utils/logger.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const { email } = parseBody(event)

  if (!email || !email.includes('@')) {
    return errorResponse('Valid email required')
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    // Add to waitlist
    addToWaitlist(normalizedEmail)

    // Log waitlist signup
    await logWaitlist(normalizedEmail)

    // Notify admin
    if (RESEND_API_KEY && ADMIN_NOTIFICATION_EMAIL) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Tennis Court Finder <noreply@tennis-courts.fortylove.net>',
            to: ADMIN_NOTIFICATION_EMAIL,
            subject: 'New Waitlist Request - Tennis Court Finder',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #16a34a;">New Waitlist Request</h1>
                <p>A new user has requested access to Tennis Court Finder:</p>
                <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <strong>Email:</strong> ${normalizedEmail}
                </div>
                <p>
                  To grant access, add this email to the ALLOWED_EMAILS environment variable in your Netlify settings.
                </p>
                <p style="color: #666; font-size: 14px;">
                  Timestamp: ${new Date().toISOString()}
                </p>
              </div>
            `
          })
        })

        trackApiUsage('resend')
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError)
        // Don't fail the request if notification fails
      }
    }

    return jsonResponse({
      success: true,
      message: 'Added to waitlist'
    })
  } catch (error) {
    console.error('Waitlist error:', error)
    return errorResponse('Failed to join waitlist', 500)
  }
}
