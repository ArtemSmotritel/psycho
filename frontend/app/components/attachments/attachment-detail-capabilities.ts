import type { Attachment } from '~/models/attachment'

export type AttachmentDetailRole = 'psycho' | 'client'

export interface AttachmentDetailCapabilities {
    canEdit: boolean
    canDelete: boolean
    canReact: boolean
    canReply: boolean
}

const NONE: AttachmentDetailCapabilities = {
    canEdit: false,
    canDelete: false,
    canReact: false,
    canReply: false,
}

// Mirrors backend validation in backend/src/features/attachments/services.ts
// (PSYCHO_UPDATE_RULES, PSYCHO_DELETE_RULES, CLIENT_DELETE_RULES) and the route
// handlers for /reply and /reaction. Authorship is implicit: by the time a
// non-impression attachment is returned to a role, the API has already filtered
// to the requester's own rows.
export function getAttachmentDetailCapabilities(
    role: AttachmentDetailRole,
    attachment: Attachment,
): AttachmentDetailCapabilities {
    if (role === 'psycho') {
        if (attachment.type === 'note' || attachment.type === 'recommendation') {
            return {
                canEdit: true,
                canDelete: true,
                canReact: false,
                canReply: attachment.type === 'recommendation',
            }
        }
        return NONE
    }

    if (attachment.type === 'impression') {
        return { canEdit: false, canDelete: true, canReact: false, canReply: false }
    }
    if (attachment.type === 'recommendation') {
        return { canEdit: false, canDelete: false, canReact: true, canReply: false }
    }
    return NONE
}
