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
                ...prefix(":clientId", [
                    layout("routes/psychologist/client-layout.tsx", [
                        index("routes/psychologist/client-profile.tsx"),
                        route("progress", "routes/psychologist/client-progress.tsx"),
                        ...prefix("sessions", [
                            index("routes/psychologist/client-sessions.tsx"),
                            ...prefix(":sessionId", [
                                layout("routes/psychologist/session-layout.tsx", [
                                    index("routes/psychologist/session.tsx"),
                                    ...prefix("attachment", [
                                        route(":attachmentId", "routes/psychologist/session-attachment.tsx"),
                                    ]),
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
            ]),
            route("associative-images", "routes/psychologist/associative-images.tsx"),
            ...prefix("sessions", [
                index("routes/psychologist/sessions.tsx"),
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
