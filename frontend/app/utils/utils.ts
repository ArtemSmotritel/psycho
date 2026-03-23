import { format } from 'date-fns'

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
            return 'Client Impression'
        default:
            return type
    }
}

export const getFileUrl = (fileOrUrl: File | string) => {
    if (typeof fileOrUrl === 'string') {
        return fileOrUrl
    }
    return URL.createObjectURL(fileOrUrl)
}
