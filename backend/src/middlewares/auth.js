import { createMiddleware } from "hono/factory";
import {
	APP_ROLE_HEADER,
	CLIENT_ROLE,
	NO_ROLE,
	PSYCHO_ROLE,
} from "../constants";

export const authorized = createMiddleware(async (c, next) => {
	const user = c.get("user");
	const session = c.get("session");

	if (!user || !session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
});

export const setUserRole = createMiddleware(async (c, next) => {
	const role = c.req.header(APP_ROLE_HEADER);

	if (role === CLIENT_ROLE) {
		c.set("role", CLIENT_ROLE);
	} else if (role === PSYCHO_ROLE) {
		c.set("role", PSYCHO_ROLE);
	} else if (!role) {
		c.set("role", NO_ROLE);
	} else {
		return c.json({ error: "Invalid role" }, 400);
	}

	await next();
});

export const onlyPsychoRequest = createMiddleware(async (c, next) => {
	const role = c.get("role");

	if (role !== PSYCHO_ROLE) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	await next();
});

export const onlyClientRequest = createMiddleware(async (c, next) => {
	const role = c.get("role");

	if (role !== CLIENT_ROLE) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	await next();
});
