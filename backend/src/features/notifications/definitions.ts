import type {
    AppointmentEmailContext,
    InvitationEmailContext,
    NotificationType,
    OutboxRow,
} from './models'
import { NotificationsRepo } from './repo'
import { templates, type RenderedEmail } from './templates'

/**
 * Sender-side registry: everything type-specific about delivering one outbox row.
 * The sender tick stays type-blind — adding an email type means adding an entry here
 * (plus a context query if the type references a new entity).
 */
export interface NotificationDefinition<Ctx> {
    /** Re-fetch fresh context for the row; null means nothing to send → skipped. */
    getContext(row: OutboxRow): Promise<Ctx | null>
    /** True if the email no longer makes sense to send; absent → never stale. */
    isStale?(ctx: Ctx): boolean
    render(ctx: Ctx): RenderedEmail
}

const define = <Ctx>(def: NotificationDefinition<Ctx>) => def

const appointmentGone = (ctx: AppointmentEmailContext): boolean =>
    !ctx.appointmentStartTime || Boolean(ctx.appointmentStartedAt)

export const DEFINITIONS: Record<NotificationType, NotificationDefinition<any>> = {
    session_reminder: define<AppointmentEmailContext>({
        getContext: (row) => NotificationsRepo.findAppointmentContext(row.id),
        isStale: appointmentGone,
        render: templates.session_reminder,
    }),

    rec_reminder: define<AppointmentEmailContext>({
        getContext: (row) => NotificationsRepo.findAppointmentContext(row.id),
        isStale: appointmentGone,
        render: templates.rec_reminder,
    }),

    rec_created: define<AppointmentEmailContext>({
        getContext: (row) => NotificationsRepo.findAppointmentContext(row.id),
        render: templates.rec_created,
    }),

    invitation_created: define<InvitationEmailContext>({
        getContext: (row) => NotificationsRepo.findInvitationContext(row.id),
        isStale: (ctx) => ctx.invitationStatus !== 'pending',
        render: templates.invitation_created,
    }),
}
