import { Hono } from "hono";

const health = new Hono();

const startTime = Date.now();

health.get("/", (c) => {
  return c.json({
    service: "quantico-ai-agency",
    status: "operational",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

health.get("/ready", (c) => {
  return c.json({ ready: true });
});

export { health };
