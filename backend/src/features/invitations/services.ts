import { db } from 'config/db'
import { isClientLinkedToPsycho, linkClientToPsycho } from '../clients/services'

export interface Invitation {
    id: string
    psychologistId: string
    invitedEmail: string
    token: string
    status: string
    createdAt: string
    expiresAt: string
}

export async function createInvitation(psychologistId: string, email: string): Promise<Invitation> {
    const normalizedEmail = email.toLowerCase().trim()

    // Check if the email belongs to someone already linked to this psychologist
    const [existingUser] = await db`SELECT id FROM "user" WHERE LOWER(email) = ${normalizedEmail}`
    if (existingUser) {
        const alreadyLinked = await isClientLinkedToPsycho(existingUser.id, psychologistId)
        if (alreadyLinked) {
            throw new InvitationError('AlreadyLinked', 'This person is already your client.')
        }
    }

    // Return existing pending non-expired invitation if one exists
    const [existingInvitation] = await db`
        SELECT
            id,
            psychologist_id AS "psychologistId",
            invited_email AS "invitedEmail",
            token,
            status,
            created_at AS "createdAt",
            expires_at AS "expiresAt"
        FROM invitations
        WHERE psychologist_id = ${psychologistId}
          AND LOWER(invited_email) = ${normalizedEmail}
          AND status = 'pending'
          AND expires_at > NOW()
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
            created_at AS "createdAt",
            expires_at AS "expiresAt"
    `

    return invitation as Invitation
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
        throw new InvitationError('NotFound', 'Invitation not found.')
    }

    if (invitation.status === 'accepted') {
        throw new InvitationError('AlreadyAccepted', 'This invitation has already been accepted.')
    }

    // Check expiry separately from the query so we can give a specific error
    const [expired] = await db`
        SELECT 1 FROM invitations
        WHERE token = ${token} AND expires_at <= NOW()
    `
    if (expired) {
        throw new InvitationError(
            'Expired',
            'This invitation has expired. Ask your psychologist to send a new one.',
        )
    }

    if (invitation.invitedEmail.toLowerCase() !== normalizedEmail) {
        throw new InvitationError(
            'EmailMismatch',
            'Please sign in with the email this invitation was sent to.',
        )
    }

    const alreadyLinked = await isClientLinkedToPsycho(userId, invitation.psychologistId)
    if (alreadyLinked) {
        throw new InvitationError(
            'AlreadyLinked',
            'You are already connected to this psychologist.',
        )
    }

    // Transaction: update invitation + create link
    await db.begin(async (tx) => {
        await tx`UPDATE invitations SET status = 'accepted' WHERE id = ${invitation.id}`
        await tx`
            INSERT INTO psychologist_clients (client_id, psycho_id)
            VALUES (${userId}, ${invitation.psychologistId})
        `
    })

    return { psychologistId: invitation.psychologistId, clientId: userId }
}

export class InvitationError extends Error {
    code: string
    constructor(code: string, message: string) {
        super(message)
        this.code = code
    }
}
