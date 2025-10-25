import Elysia from "elysia";
import { authMiddleware } from "utils/auth";
import { cors } from "@elysiajs/cors";
import { log } from "utils/logger";

export const app = new Elysia({
  name: "Psycho-help",
  serve: {
    maxRequestBodySize: 1024 * 1024 * 256, // 256MB,
  },
})
  .onBeforeHandle({ as: "global" }, ({ request }) => {
    log.info(`${request.method} ${request.url}`);
  })
  .use(
    cors({
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(authMiddleware);
