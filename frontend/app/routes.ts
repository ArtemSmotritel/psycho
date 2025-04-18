import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("login/psychologist", "routes/login.psychologist.tsx"),
    route("login/client", "routes/login.client.tsx"),
    ...prefix("dashboard", [ 
        layout("routes/dashboard.tsx", [
            index("routes/dashboard.index.tsx"),
            route("clients", "routes/dashboard.clients.tsx"),
            route("appointments", "routes/dashboard.appointments.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
