import type { MiddlewareHandler } from "hono";

export function gatewayAuth(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.req.header("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const token = auth.slice(7);
    if (token !== secret) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
