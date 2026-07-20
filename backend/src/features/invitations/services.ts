import { db } from 'config/db'
import { BadRequestError, NotFoundError } from 'errors/index'
import { ClientsRepo } from '../clients/repo'
import { ClientsService } from '../clients/services'
import { UsersRepo } from '../users/repo'
import type { Invitation } from './models'
import { InvitationsRepo } from './repo'

const buildInviteLink = (token: string): string => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return `${frontendUrl}/invite?token=${token}`
}

const withInviteLink = (invitation: Invitation): Invitation => ({
    ...invitation,
    inviteLink: buildInviteLink(invitation.token),
})

export const InvitationsService = {
    async listPendingForPsycho(psychoId: string): Promise<Invitation[]> {
        const invitations = await InvitationsRepo.listPendingByPsycho(psychoId)
        return invitations.map(withInviteLink)
    },

    async createForPsycho(psychoId: string, email: string): Promise<Invitation> {
        const normalizedEmail = email.toLowerCase().trim()

        const existingUserId = await UsersRepo.findIdByEmail(normalizedEmail)
        if (existingUserId === psychoId) {
            throw new BadRequestError('You cannot add yourself as a client.', 'SelfLinkNotAllowed')
        }
        if (existingUserId) {
            const alreadyLinked = await ClientsRepo.isLinkedToPsycho(existingUserId, psychoId)
            if (alreadyLinked) {
                throw new BadRequestError('This person is already your client.', 'AlreadyLinked')
            }
        }

        const existing = await InvitationsRepo.findPendingByPsychoAndEmail(
            psychoId,
            normalizedEmail,
        )
        if (existing) return withInviteLink(existing)

        const created = await InvitationsRepo.insert(psychoId, normalizedEmail)
        return withInviteLink(created)
    },

    async deleteForPsycho(psychoId: string, invitationId: string): Promise<void> {
        const invitation = await InvitationsRepo.findById(invitationId)
        if (!invitation || invitation.psychologistId !== psychoId) {
            throw new NotFoundError('Invitation not found.')
        }
        if (invitation.status !== 'pending') {
            throw new BadRequestError('Only pending invitations can be deleted.', 'InvalidStatus')
        }
        await InvitationsRepo.deleteById(invitationId)
    },

    async acceptByToken(
        token: string,
        userEmail: string,
        userId: string,
    ): Promise<{ psychologistId: string; clientId: string }> {
        const normalizedEmail = userEmail.toLowerCase().trim()

        const invitation = await InvitationsRepo.findByToken(token)
        if (!invitation) {
            throw new NotFoundError('Invitation not found.')
        }

        if (invitation.status === 'accepted') {
            throw new BadRequestError(
                'This invitation has already been accepted.',
                'AlreadyAccepted',
            )
        }

        if (invitation.invitedEmail.toLowerCase() !== normalizedEmail) {
            throw new BadRequestError(
                'Please sign in with the email this invitation was sent to.',
                'EmailMismatch',
            )
        }

        if (userId === invitation.psychologistId) {
            throw new BadRequestError(
                'You cannot accept your own invitation.',
                'SelfLinkNotAllowed',
            )
        }

        const alreadyLinked = await ClientsRepo.isLinkedToPsycho(userId, invitation.psychologistId)
        if (alreadyLinked) {
            throw new BadRequestError(
                'You are already connected to this psychologist.',
                'AlreadyLinked',
            )
        }

        await db.begin(async (tx) => {
            await InvitationsRepo.markAccepted(invitation.id, tx)
            await ClientsService.linkClientToPsycho(userId, invitation.psychologistId, tx)
        })

        return { psychologistId: invitation.psychologistId, clientId: userId }
    },
} as const
