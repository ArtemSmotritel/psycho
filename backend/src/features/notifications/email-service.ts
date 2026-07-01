import { log } from 'utils/logger'
import { BrevoClient } from '@getbrevo/brevo'

export interface EmailMessage {
    to: string
    subject: string
    html: string
    text: string
}

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY as string })

export const emailService = {
    async send({ to, subject, html, text }: EmailMessage): Promise<void> {
        if (process.env.EMAIL_ENABLED !== 'true') {
            log.info(`[email:dev] -> ${to} | ${subject}`, { text })
            return
        }

        await brevo.transactionalEmails.sendTransacEmail({
            subject,
            htmlContent: html,
            textContent: text,
            sender: {
                email: process.env.BREVO_SENDER_EMAIL as string,
                name: process.env.BREVO_SENDER_NAME || 'Helpsycho',
            },
            to: [{ email: to }],
        })
    },
}
