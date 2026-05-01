import { z } from 'zod/v4'

export const fileArraySchema = z.array(z.string().min(1)).optional().default([])

export const createAttachmentSchema = z.object({
    name: z.string().min(1),
    text: z.string().nullable().optional(),
    imageFileIds: fileArraySchema,
    audioFileIds: fileArraySchema,
})

export const createAttachmentPsychoSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('note'),
        name: z.string().min(1),
        text: z.string().nullable().optional(),
        imageFileIds: fileArraySchema,
        audioFileIds: fileArraySchema,
    }),
    z.object({
        type: z.literal('recommendation'),
        name: z.string().min(1),
        text: z.string().nullable().optional(),
        imageFileIds: fileArraySchema,
        audioFileIds: fileArraySchema,
    }),
])

export const createAttachmentClientSchema = z.object({
    type: z.literal('impression'),
    name: z.string().min(1).optional(),
    text: z.string().optional(),
    imageFileIds: fileArraySchema,
    audioFileIds: fileArraySchema,
})

export const updateAttachmentSchema = z.object({
    name: z.string().min(1).optional(),
    text: z.string().optional(),
    removeFileIds: z.array(z.string().min(1)).optional(),
})

export const listQuerySchemaPsycho = z.object({
    type: z.enum(['note', 'impression', 'recommendation']).optional(),
})

export const listQuerySchemaClient = z.object({
    type: z.enum(['impression', 'recommendation']).optional(),
})
