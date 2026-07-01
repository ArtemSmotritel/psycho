import type { NotificationType, Variant } from './models'
import { NotificationsRepo, type ReminderCandidate } from './repo'

/**
 * Scheduled (cron-driven) notification descriptors. Each maps a notification type to its
 * variants and the candidate query that finds (appointment, recipient) pairs to enqueue.
 */
export interface ScheduledProducer {
    type: Extract<NotificationType, 'session_reminder' | 'rec_reminder'>
    variants: Variant[]
    find: (variant: Variant) => Promise<ReminderCandidate[]>
}

export const SCHEDULED: ScheduledProducer[] = [
    {
        type: 'session_reminder',
        variants: ['24h', '1h'],
        find: NotificationsRepo.findSessionReminderCandidates,
    },
    {
        type: 'rec_reminder',
        variants: ['2d', '1d'],
        find: NotificationsRepo.findRecReminderCandidates,
    },
]
