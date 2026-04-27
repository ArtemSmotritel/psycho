import { db } from 'config/db'
import { BadRequestError, NotFoundError } from 'errors/index'
import { isClientLinkedToPsycho } from '../clients/services'

export interface Invitation {
    id: string
    psychologistId: string
    invitedEmail: string
    token: string
    status: string
    createdAt: string
    inviteLink?: string
}

export function buildInviteLink(token: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return `${frontendUrl}/invite?token=${token}`
}

export async function createInvitation(psychologistId: string, email: string): Promise<Invitation> {
    const normalizedEmail = email.toLowerCase().trim()

    // Check if the email belongs to someone already linked to this psychologist
    const [existingUser] = await db`SELECT id FROM "user" WHERE LOWER(email) = ${normalizedEmail}`
    if (existingUser) {
        const alreadyLinked = await isClientLinkedToPsycho(existingUser.id, psychologistId)
        if (alreadyLinked) {
            throw new BadRequestError('This person is already your client.', 'AlreadyLinked')
        }
    }

    // Return existing pending invitation if one exists
    const [existingInvitation] = await db`
        SELECT
            id,
            psychologist_id AS "psychologistId",
            invited_email AS "invitedEmail",
            token,
            status,
            created_at AS "createdAt"
        FROM invitations
        WHERE psychologist_id = ${psychologistId}
          AND LOWER(invited_email) = ${normalizedEmail}
          AND status = 'pending'
    `
    if (existingInvitation) {
        return existingInvitation as Invitation
    }

    const [invitation] = await db`
        INSERT INTO invitations (psychologist_id, invited_email)
        VALUES (${psychologistId}, ${normalizedEmail})
        RETURNING
            id,
            psychologist_id AS "psychologistId",
            invited_email AS "invitedEmail",
            token,
            status,
            created_at AS "createdAt"
    `

    return invitation as Invitation
}

export async function listPendingInvitationsByPsychologist(
    psychologistId: string,
): Promise<Invitation[]> {
    const rows = await db`
        SELECT
            id,
            psychologist_id AS "psychologistId",
            invited_email AS "invitedEmail",
            token,
            status,
            created_at AS "createdAt"
        FROM invitations
        WHERE psychologist_id = ${psychologistId}
          AND status = 'pending'
        ORDER BY created_at DESC
    `
    return rows.map((row: any) => ({
        ...row,
        inviteLink: buildInviteLink(row.token),
    })) as Invitation[]
}

export async function deleteInvitation(
    psychologistId: string,
    invitationId: string,
): Promise<void> {
    const [invitation] = await db`
        SELECT psychologist_id AS "psychologistId", status
        FROM invitations
        WHERE id = ${invitationId}
    `

    if (!invitation || invitation.psychologistId !== psychologistId) {
        throw new NotFoundError('Invitation not found.')
    }

    if (invitation.status !== 'pending') {
        throw new BadRequestError('Only pending invitations can be deleted.', 'InvalidStatus')
    }

    await db`DELETE FROM invitations WHERE id = ${invitationId}`
}

export async function acceptInvitationByToken(
    token: string,
    userEmail: string,
    userId: string,
): Promise<{ psychologistId: string; clientId: string }> {
    const normalizedEmail = userEmail.toLowerCase().trim()

    const [invitation] = await db`
        SELECT id, psychologist_id AS "psychologistId", invited_email AS "invitedEmail", status
        FROM invitations
        WHERE token = ${token}
    `

    if (!invitation) {
        throw new NotFoundError('Invitation not found.')
    }

    if (invitation.status === 'accepted') {
        throw new BadRequestError('This invitation has already been accepted.', 'AlreadyAccepted')
    }

    if (invitation.invitedEmail.toLowerCase() !== normalizedEmail) {
        throw new BadRequestError(
            'Please sign in with the email this invitation was sent to.',
            'EmailMismatch',
        )
    }

    const alreadyLinked = await isClientLinkedToPsycho(userId, invitation.psychologistId)
    if (alreadyLinked) {
        throw new BadRequestError(
            'You are already connected to this psychologist.',
            'AlreadyLinked',
        )
    }

    // Transaction: update invitation + create or re-activate link
    await db.begin(async (tx) => {
        await tx`UPDATE invitations SET status = 'accepted' WHERE id = ${invitation.id}`

        // Check for a previously disconnected relationship
        const [existing] = await tx`
            SELECT 1 FROM psychologist_clients
            WHERE client_id = ${userId} AND psycho_id = ${invitation.psychologistId}
        `
        if (existing) {
            await tx`
                UPDATE psychologist_clients
                SET disconnected_at = NULL
                WHERE client_id = ${userId} AND psycho_id = ${invitation.psychologistId}
            `
        } else {
            await tx`
                INSERT INTO psychologist_clients (client_id, psycho_id)
                VALUES (${userId}, ${invitation.psychologistId})
            `
        }
    })

    return { psychologistId: invitation.psychologistId, clientId: userId }
}
