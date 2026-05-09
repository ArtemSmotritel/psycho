import type { AttachmentType } from './models'

export const ATTACHMENT_LIMITS: Record<AttachmentType, number> = {
    note: 15,
    recommendation: 10,
    impression: 10,
}
