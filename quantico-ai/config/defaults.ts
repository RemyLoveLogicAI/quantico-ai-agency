import type { GatewayConfig } from "../src/types/gateway";

export const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || "3199", 10);
export const GATEWAY_HOST = process.env.GATEWAY_HOST || "0.0.0.0";
export const ZO_WORKSPACE_URL = process.env.ZO_WORKSPACE_URL || "https://noncryptical-plentiful-porter.ngrok-free.dev";
export const WSS_GATEWAY_SECRET = process.env.WSS_GATEWAY_SECRET || "";

export function getGatewayConfig(): GatewayConfig {
  return {
    port: GATEWAY_PORT,
    host: GATEWAY_HOST,
    wssGatewaySecret: WSS_GATEWAY_SECRET,
    zoWorkspaceUrl: ZO_WORKSPACE_URL,
  };
}
