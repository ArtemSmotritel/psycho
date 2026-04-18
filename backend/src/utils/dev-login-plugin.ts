import { createAuthEndpoint } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import * as z from 'zod'
import type { BetterAuthPlugin } from 'better-auth'

/**
 * Dev-only impersonation plugin.
 *
 * Adds GET /api/auth/sign-in/dev-as/:email — looks up the user by email and
 * creates a real better-auth session using the same internal APIs sign-in/email
 * uses, minus the credential check. Only registered when ENV !== 'production'.
 *
 * Visit `/api/auth/sign-in/dev-as/psycho1@seed.local` in the browser to log in.
 */
export const devLoginPlugin = () =>
    ({
        id: 'dev-login',
        endpoints: {
            devLoginAs: createAuthEndpoint(
                '/sign-in/dev-as/:email',
                {
                    method: 'GET',
                    params: z.object({ email: z.string() }),
                },
                async (ctx) => {
                    const email = decodeURIComponent(ctx.params.email)
                    const found = await ctx.context.internalAdapter.findUserByEmail(email)
                    if (!found) {
                        return ctx.json({ error: `No user with email ${email}` }, { status: 404 })
                    }
                    const session = await ctx.context.internalAdapter.createSession(
                        found.user.id,
                        false,
                    )
                    await setSessionCookie(ctx, { session, user: found.user })
                    const redirectTo = `${process.env.FRONTEND_URL ?? ''}/role-select`
                    return ctx.redirect(redirectTo)
                },
            ),
        },
    }) satisfies BetterAuthPlugin
