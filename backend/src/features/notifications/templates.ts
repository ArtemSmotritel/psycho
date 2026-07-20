import { buildInviteLink } from '../invitations/services'
import type { AppointmentEmailContext, InvitationEmailContext } from './models'

export interface RenderedEmail {
    subject: string
    html: string
    text: string
}

/** Formats a timestamp in a fixed Europe/Kyiv timezone, Ukrainian locale. */
export function formatKyiv(ts: string): string {
    return new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(new Date(ts))
}

/** Deep link back to the app for the given role. */
export function appLink(role: 'psycho' | 'client'): string {
    const base = (process.env.FRONTEND_URL ?? '').replace(/\/+$/, '')
    return `${base}/${role}`
}

/** Builds matching html + text bodies from a heading and plain-text lines. */
function render(
    subject: string,
    heading: string,
    lines: Array<{ text: string; href?: string }>,
    link: string,
    linkLabel = 'Перейти до застосунку',
): RenderedEmail {
    const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #1a1a1a;">
            <h2>${heading}</h2>
            ${lines
                .map((l) =>
                    l.href
                        ? `<p>${l.text} <a href="${l.href}">${l.href}</a></p>`
                        : `<p>${l.text}</p>`,
                )
                .join('\n')}
            <p><a href="${link}">${linkLabel}</a></p>
        </div>
    `.trim()
    const text = [
        heading,
        '',
        ...lines.map((l) => (l.href ? `${l.text} ${l.href}` : l.text)),
        '',
        `${linkLabel}: ${link}`,
    ].join('\n')
    return { subject, html, text }
}

export const templates = {
    session_reminder(ctx: AppointmentEmailContext) {
        const when = ctx.appointmentStartTime ? formatKyiv(ctx.appointmentStartTime) : ''
        const lines: Array<{ text: string; href?: string }> = [
            { text: `Нагадуємо про сесію, що відбудеться ${when} (за київським часом).` },
        ]
        if (ctx.googleMeetLink) {
            lines.push({ text: 'Посилання на зустріч:', href: ctx.googleMeetLink })
        }
        return render(
            'Нагадування про сесію',
            'Нагадування про сесію',
            lines,
            appLink(ctx.recipientRole),
        )
    },

    rec_reminder() {
        return render(
            'У вас є невиконані рекомендації перед сесією',
            'Невиконані рекомендації',
            [{ text: 'У вас є невиконані рекомендації перед наступною сесією.' }],
            appLink('client'),
        )
    },

    rec_created() {
        return render(
            'Ваш психолог додав нову рекомендацію',
            'Нова рекомендація',
            [{ text: 'Ваш психолог додав нову рекомендацію.' }],
            appLink('client'),
        )
    },

    invitation_created(ctx: InvitationEmailContext) {
        const who = ctx.psychoName ? `Психолог ${ctx.psychoName}` : 'Психолог'
        return render(
            'Вас запрошено до Helpsycho',
            'Запрошення до Helpsycho',
            [{ text: `${who} запрошує вас приєднатися як клієнт.` }],
            buildInviteLink(ctx.token),
            'Прийняти запрошення',
        )
    },
} as const
