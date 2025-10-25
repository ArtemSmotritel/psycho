import { Elysia } from "elysia";
import { createUser } from "models/user";
import { handleErrors } from "errors/handleErrors";
import { app } from "config/app";

const appServer = app
  .get("/", async () => {
    const a = await createUser({ email: "abobus", password: "1324" });
    return a;
  })
  .onError(handleErrors)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${appServer.server?.hostname}:${appServer.server?.port}`,
);
