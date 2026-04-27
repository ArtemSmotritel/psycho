import { z } from 'zod/v4'

export const fileArraySchema = z.array(z.string().min(1)).optional().default([])
