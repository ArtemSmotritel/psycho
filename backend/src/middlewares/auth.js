import { createMiddleware } from "hono/factory";

export const authorized = createMiddleware(async (c, next) => {
  const user = c.get("user");
  const session = c.get("session");

  if (!user || !session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});
