import { BadRequestError } from 'errors/index'
import { AttachmentsRepo } from '../attachments/repo'
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
    const appointments = await ProgressRepo.listEndedAppointmentsForPair(clientId, psychoId)
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

export const ProgressService = {
    listImpressionsForPsycho,
    listSessionsForClient,
    listPsychologistsForClient: ClientsRepo.listPsychologistsForClient,
} as const
