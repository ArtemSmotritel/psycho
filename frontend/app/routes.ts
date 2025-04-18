import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    ...prefix("client", [
        route("login", "routes/client/login.tsx"),
    ]),
    ...prefix("psychologist", [
        route("login", "routes/psychologist/login.tsx"),
        ...prefix("dashboard", [ 
            layout("routes/psychologist/dashboard.tsx", [
                index("routes/psychologist/dashboard.index.tsx"),
                route("clients", "routes/psychologist/dashboard.clients.tsx"),
                route("appointments", "routes/psychologist/dashboard.appointments.tsx"),
            ]),
        ]),
    ]),
] satisfies RouteConfig;
