import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    ...prefix("psychologist", [
        route("login", "routes/psychologist/login.tsx"),
        layout("routes/psychologist/layout.tsx", [
            index("routes/psychologist/dashboard.index.tsx"),
            route("clients", "routes/psychologist/clients.tsx"),
            route("sessions", "routes/psychologist/sessions.tsx"),
            route("associative-images", "routes/psychologist/associative-images.tsx"),
            route("sessions/:sessionId", "routes/psychologist/session.tsx"),
            route("sessions/:sessionId/attachment/:type/new", "routes/psychologist/session-attachment-form.tsx"),
            route("sessions/:sessionId/attachment/:attachmentId", "routes/psychologist/session-attachment.tsx"),
        ]),
    ]),
    ...prefix("client", [
        route("login", "routes/client/login.tsx"),
        layout("routes/client/layout.tsx", [
            index("routes/client/dashboard.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
