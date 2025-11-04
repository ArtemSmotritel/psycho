import Elysia from "elysia";
import { sessionModel } from "models/session";
import { createSession } from "services/sessions";

export const sessionsRoutes = new Elysia({ name: "routes:sessions" })
  .use(sessionModel)
  .group("/sessions", (app) =>
    app.guard({ auth: true }, (app) =>
      app.post(
        "/",
        async ({ body, set }) => {
          const created = await createSession(body);
          set.status = 201;
          set.headers["Location"] = `/sessions/${created.id}`;
          return created;
        },
        {
          body: "session.create",
          response: {
            201: "session.entity",
          },
        },
      ),
    ),
  );
