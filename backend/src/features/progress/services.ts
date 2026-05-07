import { BadRequestError } from 'errors/index'
import type { Attachment, AttachmentWithReaction } from '../attachments/models'
import { ClientsRepo } from '../clients/repo'
import type { AttachmentWithAppointment, ProgressSession } from './models'
import { ProgressRepo } from './repo'

async function listImpressionsForPsycho(
    clientId: string,
    psychoId: string,
): Promise<AttachmentWithAppointment[]> {
    const linked = await ClientsRepo.isLinkedToPsycho(clientId, psychoId)
    if (!linked) {
        throw new BadRequestError('This client is not in your list.', 'ClientNotLinked')
    }
    return ProgressRepo.listImpressionsByPair(clientId, psychoId)
}

async function listSessionsForClient(
    clientId: string,
    psychoId: string,
): Promise<ProgressSession[]> {
    const linked = await ClientsRepo.isLinkedToPsycho(clientId, psychoId)
    if (!linked) {
        throw new BadRequestError('This psychologist is not in your list.', 'PsychoNotLinked')
    }
    const [appointments, impressions, recommendations] = await Promise.all([
        ProgressRepo.listEndedAppointmentsForPair(clientId, psychoId),
        ProgressRepo.listClientImpressionsForPair(clientId, psychoId),
        ProgressRepo.listRecommendationsWithReactionsForPair(clientId, psychoId),
    ])

    const impressionsByApt = new Map<string, Attachment[]>()
    for (const row of impressions) {
        const arr = impressionsByApt.get(row.appointmentId) ?? []
        arr.push(row)
        impressionsByApt.set(row.appointmentId, arr)
    }
    const recsByApt = new Map<string, AttachmentWithReaction[]>()
    for (const row of recommendations) {
        const arr = recsByApt.get(row.appointmentId) ?? []
        arr.push(row)
        recsByApt.set(row.appointmentId, arr)
    }

    return appointments.map((apt) => ({
        id: apt.id,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        impressions: impressionsByApt.get(apt.id) ?? [],
        recommendations: recsByApt.get(apt.id) ?? [],
    }))
}

export const ProgressService = {
    listImpressionsForPsycho,
    listSessionsForClient,
    listPsychologistsForClient: ClientsRepo.listPsychologistsForClient,
} as const
