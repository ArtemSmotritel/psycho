import { z } from 'zod/v4'

export const fileArraySchema = z.array(z.string().min(1)).optional().default([])

export const createAttachmentSchema = z.object({
    name: z.string().min(1),
    text: z.string().nullable().optional(),
    imageFileIds: fileArraySchema,
    audioFileIds: fileArraySchema,
})

export const updateAttachmentSchema = z.object({
    name: z.string().min(1).optional(),
    text: z.string().optional(),
    removeFileIds: z.array(z.string().min(1)).optional(),
})
