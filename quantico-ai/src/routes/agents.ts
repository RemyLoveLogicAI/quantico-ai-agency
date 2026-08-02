import { Hono } from "hono";
import { Role, ROLE_HIERARCHY } from "../types/roles";

const agents = new Hono();

agents.get("/roles", (c) => {
  const roles = Object.entries(ROLE_HIERARCHY).map(([role, config]) => ({
    role,
    ...config,
  }));
  return c.json({ roles });
});

agents.get("/roles/:role", (c) => {
  const roleParam = c.req.param("role") as Role;
  const config = ROLE_HIERARCHY[roleParam];
  if (!config) {
    return c.json({ error: `Unknown role: ${roleParam}` }, 404);
  }
  return c.json({ role: roleParam, ...config });
});

export { agents };
