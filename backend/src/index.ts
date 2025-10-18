import { Elysia } from "elysia";
import { db } from "./config/db";

const app = new Elysia()
  .get("/", async () => {
    const a = await db``;
    return a;
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
