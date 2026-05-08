import { z } from 'zod/v4'

export const fileArraySchema = z.array(z.string().min(1)).optional().default([])

const ATTACHMENT_NAME_MAX = 255
const ATTACHMENT_TEXT_MAX = 65536

export const createAttachmentPsychoSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('note'),
        name: z.string().min(1).max(ATTACHMENT_NAME_MAX),
        text: z.string().max(ATTACHMENT_TEXT_MAX).nullable().optional(),
        imageFileIds: fileArraySchema,
        audioFileIds: fileArraySchema,
    }),
    z.object({
        type: z.literal('recommendation'),
        name: z.string().min(1).max(ATTACHMENT_NAME_MAX),
        text: z.string().max(ATTACHMENT_TEXT_MAX).nullable().optional(),
        imageFileIds: fileArraySchema,
        audioFileIds: fileArraySchema,
    }),
])

export const createAttachmentClientSchema = z.object({
    type: z.literal('impression'),
    name: z.string().min(1).max(ATTACHMENT_NAME_MAX),
    text: z.string().max(ATTACHMENT_TEXT_MAX).optional(),
    imageFileIds: fileArraySchema,
    audioFileIds: fileArraySchema,
})

export const updateAttachmentSchema = z.object({
    name: z.string().min(1).max(ATTACHMENT_NAME_MAX),
    text: z.string().max(ATTACHMENT_TEXT_MAX).optional(),
    removeFileIds: z.array(z.string().min(1)).optional(),
})

export const listQuerySchemaPsycho = z.object({
    type: z.enum(['note', 'impression', 'recommendation']).optional(),
})

export const listQuerySchemaClient = z.object({
    type: z.enum(['impression', 'recommendation']).optional(),
})
