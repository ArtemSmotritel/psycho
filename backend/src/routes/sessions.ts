import Elysia from "elysia";
import { sessionModel } from "models/session";
import { createSession } from "services/sessions";

export const sessionsRoutes = new Elysia({ name: "routes:sessions" })
  .use(sessionModel)
  .group("/sessions", (app) =>
    app.post(
      "/",
      async ({ body, set }) => {
        const created = await createSession(body);
        set.status = 201;
        return created;
      },
      {
        auth: true,
        body: "session.create",
        response: {
          201: "session.entity",
        },
      },
    ),
  );
