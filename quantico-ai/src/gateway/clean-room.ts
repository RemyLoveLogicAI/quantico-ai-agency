import { Hono } from "hono";
import { gatewayAuth } from "../middleware/auth";
import type { GatewayConfig, GatewayStatus } from "../types/gateway";

export function createCleanRoomGateway(config: GatewayConfig): Hono {
  const gateway = new Hono();
  const startTime = Date.now();

  // Authenticated routes
  gateway.use("/ingest/*", gatewayAuth(config.wssGatewaySecret));
  gateway.use("/relay/*", gatewayAuth(config.wssGatewaySecret));

  gateway.get("/status", (c) => {
    const status: GatewayStatus = {
      online: true,
      port: config.port,
      connectedAgents: 0,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      zoConnected: false,
    };
    return c.json(status);
  });

  gateway.post("/ingest/intel", async (c) => {
    const body = await c.req.json();
    console.log(`[GATEWAY] Intel ingested: ${JSON.stringify(body).slice(0, 120)}`);
    return c.json({
      accepted: true,
      timestamp: new Date().toISOString(),
    });
  });

  gateway.post("/relay/dispatch", async (c) => {
    const body = await c.req.json();
    console.log(`[GATEWAY] Dispatch relayed: ${JSON.stringify(body).slice(0, 120)}`);
    return c.json({
      dispatched: true,
      timestamp: new Date().toISOString(),
    });
  });

  return gateway;
}
