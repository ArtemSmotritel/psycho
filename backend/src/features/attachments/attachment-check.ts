import { BadRequestError, NotFoundError } from 'errors/index'
import type { User } from 'utils/types'
import type {
    Attachment,
    AttachmentType,
    ImpressionCompletion,
    RecommendationReaction,
} from './models'
import { AttachmentsRepo, type AppointmentStatus, type AttachmentChain } from './repo'

type AuthorScope = 'self' | 'any'

interface PsychoInput {
    user: User
    clientId: string
    appointmentId: string
    attachmentId: string
}

interface ClientInput {
    user: User
    appointmentId: string
    attachmentId: string
}

export class AttachmentCheck {
    private expectedType?: AttachmentType
    private expectedAuthor?: AuthorScope
    private expectedAppointmentStatuses?: AppointmentStatus[]
    private typeRules?: Partial<Record<AttachmentType, AuthorScope>>
    private consumed = false

    private constructor(
        private readonly fetch: () => Promise<AttachmentChain | null>,
        private readonly userId: string,
    ) {}

    static forPsycho(input: PsychoInput): AttachmentCheck {
        return new AttachmentCheck(
            () =>
                AttachmentsRepo.findAttachmentForPsycho(
                    input.user.id,
                    input.clientId,
                    input.appointmentId,
                    input.attachmentId,
                ),
            input.user.id,
        )
    }

    static forClient(input: ClientInput): AttachmentCheck {
        return new AttachmentCheck(
            () =>
                AttachmentsRepo.findAttachmentForClient(
                    input.user.id,
                    input.appointmentId,
                    input.attachmentId,
                ),
            input.user.id,
        )
    }

    setExpectedType(type: AttachmentType): this {
        this.expectedType = type
        return this
    }

    setExpectedAuthor(scope: AuthorScope): this {
        this.expectedAuthor = scope
        return this
    }

    setExpectedAppointmentStatuses(statuses: AppointmentStatus[]): this {
        this.expectedAppointmentStatuses = statuses
        return this
    }

    // Per-type rule. Types absent from the map => NotFoundError.
    // 'self' => attachment.authorId must equal userId else NotFoundError.
    // 'any'  => no author constraint.
    setTypeRules(rules: Partial<Record<AttachmentType, AuthorScope>>): this {
        this.typeRules = rules
        return this
    }

    async run(): Promise<{
        attachment: Attachment
        appointmentStatus: AppointmentStatus
        reaction: RecommendationReaction | null
        completion: ImpressionCompletion | null
    }> {
        if (this.consumed) {
            throw new Error('AttachmentCheck.run() can only be called once per instance')
        }
        this.consumed = true

        const chain = await this.fetch()
        if (!chain) throw new NotFoundError()

        if (
            this.expectedAppointmentStatuses?.length &&
            !this.expectedAppointmentStatuses.includes(chain.appointmentStatus)
        ) {
            throw new BadRequestError(
                `Appointment status must be one of: ${this.expectedAppointmentStatuses.join(', ')}.`,
                'AppointmentStatusNotAllowed',
            )
        }

        if (this.typeRules) {
            const scope = this.typeRules[chain.attachment.type]
            if (!scope) throw new NotFoundError()
            if (scope === 'self' && chain.attachment.authorId !== this.userId) {
                throw new NotFoundError()
            }
        }

        if (this.expectedType && chain.attachment.type !== this.expectedType) {
            throw new NotFoundError()
        }
        if (this.expectedAuthor === 'self' && chain.attachment.authorId !== this.userId) {
            throw new NotFoundError()
        }

        return {
            attachment: chain.attachment,
            appointmentStatus: chain.appointmentStatus,
            reaction: chain.reaction,
            completion: chain.completion,
        }
    }
}
