import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("login/psychologist", "routes/login.psychologist.tsx"),
    route("login/client", "routes/login.client.tsx"),
] satisfies RouteConfig;
