import type { NotificationType, OutboxContext } from './models'

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
            <p><a href="${link}">Перейти до застосунку</a></p>
        </div>
    `.trim()
    const text = [
        heading,
        '',
        ...lines.map((l) => (l.href ? `${l.text} ${l.href}` : l.text)),
        '',
        `Перейти до застосунку: ${link}`,
    ].join('\n')
    return { subject, html, text }
}

export const templates: Record<NotificationType, (ctx: OutboxContext) => RenderedEmail> = {
    session_reminder(ctx) {
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
}
