import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    ...prefix("psychologist", [
        route("login", "routes/psychologist/login.tsx"),
        layout("routes/psychologist/layout.tsx", [
            index("routes/psychologist/dashboard.index.tsx"),
            ...prefix("clients", [
                index("routes/psychologist/clients.tsx"),
                route(":clientId", "routes/psychologist/client-profile.tsx"),
                route(":clientId/sessions", "routes/psychologist/client-sessions.tsx"), 
            ]),
            route("associative-images", "routes/psychologist/associative-images.tsx"),
            ...prefix("sessions", [
                index("routes/psychologist/sessions.tsx"),
                route(":sessionId", "routes/psychologist/session.tsx"),
                route(":sessionId/attachment/:type/new", "routes/psychologist/session-attachment-form.tsx"),
                route(":sessionId/attachment/:attachmentId", "routes/psychologist/session-attachment.tsx"),
            ]),
        ]),
    ]),
    ...prefix("client", [
        route("login", "routes/client/login.tsx"),
        layout("routes/client/layout.tsx", [
            index("routes/client/dashboard.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
