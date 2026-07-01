import { log } from 'utils/logger'
import { NotificationsService } from './services'

async function safeTick(name: string, run: () => Promise<void>): Promise<void> {
    try {
        await run()
    } catch (err) {
        // A tick must never throw out of the cron callback.
        log.error(`[notifications] ${name} tick failed`, err)
    }
}

/**
 * Wire the transactional-outbox cron jobs. Single-instance only — see the feature plan's
 * known-limitations section. Requires Bun >= 1.3.11 for the in-process callback form.
 */
export function registerNotificationCrons(): void {
    Bun.cron('*/10 * * * *', () => safeTick('decision', NotificationsService.runDecisionTick))
    Bun.cron('* * * * *', () => safeTick('sender', NotificationsService.runSenderTick))
    log.info('[notifications] cron jobs registered')
}
