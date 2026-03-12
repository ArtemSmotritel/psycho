import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import { DB_URL } from 'config/index'
import { Pool } from 'pg'
import { createUserClient } from '../features/clients/services'
import { createPsycho } from '../features/psycho/services'
import { log } from './logger'

export const auth = betterAuth({
    database: new Pool({
        connectionString: DB_URL,
    }),
    trustedOrigins: [process.env.FRONTEND_URL as string],
    socialProviders: {
        google: {
            prompt: 'select_account',
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            redirectUri: process.env.GOOGLE_REDIRECT_URI as string,
        },
    },
    plugins: [...(process.env.NODE_ENV === 'test' ? [testUtils()] : [])],
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await createUserClient(user.id)
                    await createPsycho(user.id)
                },
            },
        },
    },
})

log.info(process.env.GOOGLE_REDIRECT_URI as string)
