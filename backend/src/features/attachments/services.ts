import { db } from 'config/db'
import { BadRequestError, ConflictError, NotFoundError } from 'errors/index'
import type { User } from 'utils/types'
import { AppointmentsService } from '../appointments/services'
import { FilesService } from '../files/services'
import { AttachmentCheck } from './attachment-check'
import type {
    Attachment,
    AttachmentType,
    AttachmentWithAppointment,
    ClientAttachmentList,
    ImpressionCompletion,
    ProgressSession,
    PsychoAttachmentList,
    RecommendationReaction,
} from './models'
import { AttachmentsRepo } from './repo'

async function create(params: {
    appointmentId: string
    authorId: string
    type: AttachmentType
    name?: string | null
    text?: string | null
    imageFileIds?: string[]
    audioFileIds?: string[]
}): Promise<Attachment> {
    const fileLinks = [
        ...(params.imageFileIds ?? []).map((fileId, position) => ({
            fileId,
            fileType: 'image' as const,
            position,
        })),
        ...(params.audioFileIds ?? []).map((fileId, position) => ({
            fileId,
            fileType: 'audio' as const,
            position,
        })),
    ]

    return db.begin(async (tx) => {
        const { id } = await AttachmentsRepo.insert(
            {
                appointmentId: params.appointmentId,
                authorId: params.authorId,
                type: params.type,
                name: params.name ?? null,
                text: params.text ?? null,
            },
            tx,
        )
        await AttachmentsRepo.linkFiles(id, fileLinks, tx)
        return (await AttachmentsRepo.findById(id, tx))!
    })
}

async function createForPsychoView(input: {
    psychoId: string
    clientId: string
    appointmentId: string
    type: 'note' | 'recommendation'
    name: string
    text?: string | null
    imageFileIds: string[]
    audioFileIds: string[]
}): Promise<Attachment> {
    const appointment = await AppointmentsService.getForPsycho(
        input.appointmentId,
        input.psychoId,
        input.clientId,
    )
    if (appointment.status === 'upcoming') {
        throw new BadRequestError('Appointment is not active or past.', 'AppointmentNotActive')
    }
    const text = input.text?.trim() || null
    return create({
        appointmentId: input.appointmentId,
        authorId: input.psychoId,
        type: input.type,
        name: input.name,
        text,
        imageFileIds: input.imageFileIds,
        audioFileIds: input.audioFileIds,
    })
}

async function createForClientView(input: {
    clientId: string
    appointmentId: string
    name?: string
    text?: string
    imageFileIds: string[]
    audioFileIds: string[]
}): Promise<Attachment> {
    const appointment = await AppointmentsService.getForClient(input.appointmentId, input.clientId)
    if (appointment.status === 'upcoming') {
        throw new BadRequestError('Appointment has not started yet.', 'AppointmentNotStarted')
    }
    const text = input.text?.trim() || null
    if (!text && input.imageFileIds.length === 0 && input.audioFileIds.length === 0) {
        throw new BadRequestError(
            'At least one of text, imageFileIds, or audioFileIds is required.',
        )
    }
    return create({
        appointmentId: input.appointmentId,
        authorId: input.clientId,
        type: 'impression',
        name: input.name ?? null,
        text,
        imageFileIds: input.imageFileIds,
        audioFileIds: input.audioFileIds,
    })
}

async function updateAttachment(
    id: string,
    params: { name: string | null; text: string | null; removeFileIds?: string[] },
): Promise<Attachment> {
    await db.begin(async (tx) => {
        await AttachmentsRepo.update(id, { name: params.name, text: params.text }, tx)

        const removeFileIds = params.removeFileIds ?? []
        if (removeFileIds.length > 0) {
            await AttachmentsRepo.unlinkFiles(id, removeFileIds, tx)
            const files = await AttachmentsRepo.deleteFilesAndReturnStoredNames(removeFileIds, tx)
            for (const file of files) {
                await FilesService.removeFromDisk(file.storedName)
            }
        }
    })

    return (await AttachmentsRepo.findById(id))!
}

async function updateForPsycho(
    type: 'note' | 'recommendation',
    input: {
        user: User
        clientId: string
        appointmentId: string
        attachmentId: string
        name?: string
        text?: string
        removeFileIds?: string[]
    },
): Promise<Attachment> {
    const appointment = await AppointmentsService.getForPsycho(
        input.appointmentId,
        input.user.id,
        input.clientId,
    )
    if (appointment.status === 'upcoming') {
        throw new BadRequestError('Appointment is not active or past.', 'AppointmentNotActive')
    }

    await AttachmentCheck.forPsycho({
        user: input.user,
        clientId: input.clientId,
        appointmentId: input.appointmentId,
        attachmentId: input.attachmentId,
    })
        .setExpectedType(type)
        .setExpectedAuthor('self')
        .run()

    return updateAttachment(input.attachmentId, {
        name: input.name ?? null,
        text: input.text ?? null,
        removeFileIds: input.removeFileIds,
    })
}

async function updateNoteForPsychoView(input: {
    user: User
    clientId: string
    appointmentId: string
    attachmentId: string
    name?: string
    text?: string
    removeFileIds?: string[]
}): Promise<Attachment> {
    return updateForPsycho('note', input)
}

async function updateRecommendationForPsychoView(input: {
    user: User
    clientId: string
    appointmentId: string
    attachmentId: string
    name?: string
    text?: string
    removeFileIds?: string[]
}): Promise<Attachment> {
    return updateForPsycho('recommendation', input)
}

async function replyToRecommendationForPsychoView(input: {
    user: User
    clientId: string
    appointmentId: string
    attachmentId: string
    reply: string
}): Promise<RecommendationReaction> {
    const { reaction } = await AttachmentCheck.forPsycho({
        user: input.user,
        clientId: input.clientId,
        appointmentId: input.appointmentId,
        attachmentId: input.attachmentId,
    })
        .setExpectedType('recommendation')
        .setExpectedAuthor('self')
        .run()

    if (reaction !== null && reaction.psychologistReply !== null) {
        throw new BadRequestError('Reply has already been set.', 'ReplyAlreadySet')
    }

    return AttachmentsRepo.setReply(input.attachmentId, input.reply)
}

async function reactToRecommendationForClientView(input: {
    user: User
    appointmentId: string
    attachmentId: string
    done?: boolean
    comment?: string
}): Promise<RecommendationReaction> {
    if (input.done === undefined && input.comment === undefined) {
        throw new BadRequestError('done or comment is required')
    }

    const { reaction } = await AttachmentCheck.forClient({
        user: input.user,
        appointmentId: input.appointmentId,
        attachmentId: input.attachmentId,
    })
        .setExpectedType('recommendation')
        .run()

    if (input.comment !== undefined && reaction !== null && reaction.clientComment !== null) {
        throw new BadRequestError('Comment has already been set.', 'CommentAlreadySet')
    }

    return AttachmentsRepo.upsertReaction(input.attachmentId, {
        done: input.done,
        comment: input.comment,
    })
}

async function completeImpressionForClientView(input: {
    user: User
    appointmentId: string
    attachmentId: string
    response: string
}): Promise<ImpressionCompletion> {
    const { completion } = await AttachmentCheck.forClient({
        user: input.user,
        appointmentId: input.appointmentId,
        attachmentId: input.attachmentId,
    })
        .setExpectedType('impression')
        .setExpectedAuthor('self')
        .run()

    if (completion !== null) {
        throw new BadRequestError(
            'This impression has already been completed.',
            'AlreadyCompleted',
        )
    }

    return AttachmentsRepo.insertImpressionCompletion(input.attachmentId, input.response)
}

async function listImpressionsForClientByPsycho(
    clientId: string,
    psychoId: string,
): Promise<AttachmentWithAppointment[]> {
    return AttachmentsRepo.listImpressionsByPair(clientId, psychoId)
}

async function listClientProgressByPsycho(
    clientId: string,
    psychoId: string,
): Promise<ProgressSession[]> {
    const appointments = await AttachmentsRepo.listEndedAppointmentsForPair(clientId, psychoId)

    return Promise.all(
        appointments.map(async (apt) => {
            const [impressions, recommendations] = await Promise.all([
                AttachmentsRepo.listByAuthor(apt.id, 'impression', clientId),
                AttachmentsRepo.listWithReactions(apt.id, 'recommendation'),
            ])
            return {
                id: apt.id,
                startTime: apt.startTime,
                endTime: apt.endTime,
                status: apt.status,
                impressions,
                recommendations,
            }
        }),
    )
}

async function listForPsychoView(
    appointmentId: string,
    psychoId: string,
    clientId: string,
    types?: AttachmentType[],
): Promise<PsychoAttachmentList> {
    await AppointmentsService.getForPsycho(appointmentId, psychoId, clientId)

    const chains = await AttachmentsRepo.listForPsychoView(appointmentId, psychoId, types)

    const result: PsychoAttachmentList = { notes: [], impressions: [], recommendations: [] }
    for (const { attachment, reaction, completion } of chains) {
        if (attachment.type === 'note') {
            result.notes.push(attachment)
        } else if (attachment.type === 'impression') {
            result.impressions.push({ ...attachment, completion })
        } else {
            result.recommendations.push({ ...attachment, reaction })
        }
    }
    return result
}

async function listForClientView(
    appointmentId: string,
    clientId: string,
    types?: AttachmentType[],
): Promise<ClientAttachmentList> {
    await AppointmentsService.getForClient(appointmentId, clientId)

    const chains = await AttachmentsRepo.listForClientView(appointmentId, clientId, types)

    const result: ClientAttachmentList = { impressions: [], recommendations: [] }
    for (const { attachment, reaction, completion } of chains) {
        if (attachment.type === 'impression') {
            result.impressions.push({ ...attachment, completion })
        } else if (attachment.type === 'recommendation') {
            result.recommendations.push({ ...attachment, reaction })
        }
    }
    return result
}

const PSYCHO_DELETE_RULES = {
    note: 'self',
    recommendation: 'self',
} as const satisfies Partial<Record<AttachmentType, 'self' | 'any'>>

const CLIENT_DELETE_RULES = {
    impression: 'self',
} as const satisfies Partial<Record<AttachmentType, 'self' | 'any'>>

async function deleteForPsychoView(input: {
    user: User
    clientId: string
    appointmentId: string
    attachmentId: string
}): Promise<void> {
    const { attachment, reaction } = await AttachmentCheck.forPsycho(input)
        .setTypeRules(PSYCHO_DELETE_RULES)
        .run()

    if (attachment.type === 'recommendation' && reaction !== null) {
        throw new ConflictError(
            'Recommendation has a client reaction and cannot be deleted.',
            'RecommendationHasReaction',
        )
    }

    await deleteAttachmentAndOrphanFiles(attachment)
}

async function deleteForClientView(input: {
    user: User
    appointmentId: string
    attachmentId: string
}): Promise<void> {
    const { attachment, completion } = await AttachmentCheck.forClient(input)
        .setTypeRules(CLIENT_DELETE_RULES)
        .run()

    if (attachment.type === 'impression' && completion !== null) {
        throw new ConflictError(
            'Impression has a psychologist completion and cannot be deleted.',
            'ImpressionHasCompletion',
        )
    }

    await deleteAttachmentAndOrphanFiles(attachment)
}

async function deleteAttachmentAndOrphanFiles(attachment: Attachment): Promise<void> {
    const fileIds = [
        ...attachment.imageFiles.map((f) => f.id),
        ...attachment.audioFiles.map((f) => f.id),
    ]
    await db.begin(async (tx) => {
        await AttachmentsRepo.deleteById(attachment.id, tx)
        await FilesService.cleanupOrphans(fileIds, tx)
    })
}

type PsychoGetResult =
    | { attachment: Attachment }
    | { attachment: Attachment; reaction: RecommendationReaction | null }
    | { attachment: Attachment; completion: ImpressionCompletion | null }

async function getForPsychoView(input: {
    user: User
    clientId: string
    appointmentId: string
    attachmentId: string
}): Promise<PsychoGetResult> {
    const { attachment, reaction, completion } = await AttachmentCheck.forPsycho(input).run()
    // psycho per-type rule:
    // - impression: any author
    // - note / recommendation: must be authored by this psycho
    if (attachment.type !== 'impression' && attachment.authorId !== input.user.id) {
        throw new NotFoundError()
    }
    if (attachment.type === 'recommendation') return { attachment, reaction }
    if (attachment.type === 'impression') return { attachment, completion }
    return { attachment }
}

type ClientGetResult =
    | { attachment: Attachment; reaction: RecommendationReaction | null }
    | { attachment: Attachment; completion: ImpressionCompletion | null }

async function getForClientView(input: {
    user: User
    appointmentId: string
    attachmentId: string
}): Promise<ClientGetResult> {
    const { attachment, reaction, completion } = await AttachmentCheck.forClient(input).run()
    // client per-type rule:
    // - impression: must be authored by this client
    // - recommendation: any psycho-authored is fine
    if (attachment.type === 'impression' && attachment.authorId !== input.user.id) {
        throw new NotFoundError()
    }
    if (attachment.type === 'recommendation') return { attachment, reaction }
    return { attachment, completion }
}

export const AttachmentsService = {
    create,
    listByAuthor: AttachmentsRepo.listByAuthor,
    upsertReaction: AttachmentsRepo.upsertReaction,
    listWithReactions: AttachmentsRepo.listWithReactions,
    listImpressionsForClientByPsycho,
    listClientProgressByPsycho,
    completeImpression: AttachmentsRepo.insertImpressionCompletion,
    listForPsycho: listForPsychoView,
    listForClient: listForClientView,
    createForPsycho: createForPsychoView,
    createForClient: createForClientView,
    getForPsycho: getForPsychoView,
    getForClient: getForClientView,
    deleteForPsycho: deleteForPsychoView,
    deleteForClient: deleteForClientView,
    updateNoteForPsycho: updateNoteForPsychoView,
    updateRecommendationForPsycho: updateRecommendationForPsychoView,
    replyToRecommendationForPsycho: replyToRecommendationForPsychoView,
    reactToRecommendationForClient: reactToRecommendationForClientView,
    completeImpressionForClient: completeImpressionForClientView,
} as const
