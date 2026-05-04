import { format } from 'date-fns'
import type { Attachment } from '~/models/attachment'

export function formatAppDate(date: Date | string) {
    if (typeof date === 'string') {
        return format(new Date(date), 'PPP HH:mm')
    }

    return format(date, 'PPP HH:mm')
}

export const getAttachmentTypeLabel = (type: string) => {
    switch (type) {
        case 'note':
            return 'Note'
        case 'recommendation':
            return 'Recommendation'
        case 'impression':
            return 'Impression'
        default:
            return type
    }
}

export function formatAttachmentTitle(
    attachment: Pick<Attachment, 'name' | 'type' | 'createdAt'>,
): string {
    if (attachment.name) return attachment.name
    return `${getAttachmentTypeLabel(attachment.type)} — ${formatAppDate(attachment.createdAt)}`
}

export const getFileUrl = (fileOrUrl: File | string) => {
    if (typeof fileOrUrl === 'string') {
        return fileOrUrl
    }
    return URL.createObjectURL(fileOrUrl)
}
