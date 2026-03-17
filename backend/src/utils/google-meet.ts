import { google } from 'googleapis'
import { db } from 'config/db'
import { log } from 'utils/logger'

// Module-level constant — reused across requests; auth is passed per-request
const calendar = google.calendar('v3')

export async function generateGoogleMeetLink(
    psychoId: string,
    clientId: string,
    startTime: string,
    endTime: string,
): Promise<string | null> {
    try {
        const [account] = await db`
            SELECT "accessToken", "refreshToken", "accessTokenExpiresAt", "scope"
            FROM account
            WHERE "userId" = ${psychoId}
              AND "providerId" = 'google'
            LIMIT 1
        `

        if (!account) return null

        // Defensive: if user hasn't granted calendar scope yet, skip the API call
        if (!account.scope?.includes('calendar')) {
            log.warn('[GoogleMeet] User has not granted calendar scope', { psychoId })
            return null
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
        )

        oauth2Client.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
        })

        // Refresh token proactively if within 60s of expiry
        const isExpired =
            account.accessTokenExpiresAt &&
            new Date(account.accessTokenExpiresAt).getTime() - Date.now() < 60_000

        if (isExpired && account.refreshToken) {
            log.debug(`Trying to refresh google access token for user=${psychoId}`)
            const { credentials } = await oauth2Client.refreshAccessToken()
            oauth2Client.setCredentials(credentials)
            log.debug(`Google access token is successfully refreshed for user=${psychoId}`)

            await db`
                UPDATE account
                SET "accessToken" = ${credentials.access_token},
                    "accessTokenExpiresAt" = ${new Date(credentials.expiry_date!).toISOString()}
                WHERE "userId" = ${psychoId}
                  AND "providerId" = 'google'
            `
            log.debug(
                `Refreshed Google access token is successfully saved in the db for user=${psychoId}`,
            )
        }

        // Fetch client email to invite them to the Calendar event
        const [clientUser] = await db`SELECT email FROM "user" WHERE id = ${clientId}`
        const attendees = clientUser?.email ? [{ email: clientUser.email }] : []

        const event = await calendar.events.insert({
            auth: oauth2Client,
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: {
                summary: 'Therapy session',
                start: { dateTime: startTime },
                end: { dateTime: endTime },
                attendees,
                conferenceData: {
                    createRequest: {
                        requestId: crypto.randomUUID(),
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
            },
        })

        return (
            event.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')
                ?.uri ?? null
        )
    } catch (err) {
        log.warn('[GoogleMeet] Failed to generate Meet link', { psychoId, err })
        return null
    }
}
