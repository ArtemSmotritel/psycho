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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {},
      },
    },
  },
});

log.info(process.env.GOOGLE_REDIRECT_URI as string);
