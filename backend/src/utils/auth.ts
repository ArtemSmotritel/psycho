import { betterAuth } from "better-auth";
import { DB_URL } from "config/index";
import Elysia from "elysia";
import { Pool } from "pg";
import { log } from "./logger";

export const auth = betterAuth({
  database: new Pool({
    connectionString: DB_URL,
  }),
  trustedOrigins: [process.env.FRONTEND_URL as string],
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectUri: process.env.GOOGLE_REDIRECT_URI as string,
    },
  },
});

log.info(process.env.GOOGLE_REDIRECT_URI as string);

export const authMiddleware = new Elysia({ name: "auth-guard" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });
        if (!session) return status(401);
        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
