import type { CLIENT_ROLE, NO_ROLE, PSYCHO_ROLE } from "../constants";
import type { auth } from "./auth";

declare module "hono" {
  interface ContextVariableMap {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    role: typeof CLIENT_ROLE | typeof PSYCHO_ROLE | typeof NO_ROLE;
  }
}

export interface MiddlewareVariable<K extends string, V> {
  Variables: Record<K, V>;
}
