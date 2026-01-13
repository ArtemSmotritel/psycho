import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { log } from "utils/logger";
import { auth } from "utils/auth";
import { setUserRole } from "../middlewares/auth";

export const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(
  cors({
    origin: process.env.FRONTEND_URL as string,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.use(logger());

app.onError((err, c) => {
  log.error(`[Error] ${c.req.method} ${c.req.url}:`, err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err.name === "ZodError") {
    return c.json(
      {
        success: false,
        message: "Validation Failed",
        errors: err,
      },
      400,
    );
  }

  return c.json(
    {
      success: false,
      message: err.message || "Internal Server Error",
      // Hide stack traces in production
      stack: process.env.ENV === "production" ? undefined : err.stack,
    },
    500,
  );
});

app.notFound((c) => {
  return c.json({ message: "Route not found", success: false }, 404);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.use(setUserRole);
