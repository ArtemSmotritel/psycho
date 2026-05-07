import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import { DB_URL } from 'config/index'
import { Pool } from 'pg'
import { log } from './logger'
import { devLoginPlugin } from './dev-login-plugin'

const isTest = process.env.NODE_ENV === 'test'
const isProd = process.env.ENV === 'production'

export const auth = betterAuth({
    database: new Pool({
        connectionString: DB_URL,
    }),
    trustedOrigins: [process.env.FRONTEND_URL as string],
    socialProviders: {
        google: {
            prompt: 'consent',
            accessType: 'offline',
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            redirectUri: process.env.GOOGLE_REDIRECT_URI as string,
            scope: [
                'openid',
                'email',
                'profile',
                'https://www.googleapis.com/auth/calendar.events',
            ],
        },
    },
    plugins: [...(isTest ? [testUtils()] : []), ...(!isProd && !isTest ? [devLoginPlugin()] : [])],
    // advanced: {
    //     database: {
    //         generateId: 'uuid',
    //     },
    // },
})

log.info(process.env.GOOGLE_REDIRECT_URI as string)
