/**
 * Clean-room gateway types for Quantico-AI
 */

export interface GatewayConfig {
  port: number;
  host: string;
  wssGatewaySecret: string;
  zoWorkspaceUrl: string;
}

export interface GatewayStatus {
  online: boolean;
  port: number;
  connectedAgents: number;
  uptime: number;
  zoConnected: boolean;
}

export interface InboundMessage {
  channel: string;
  sender: string;
  payload: unknown;
  timestamp: string;
  signature?: string;
}

export interface OutboundMessage {
  channel: string;
  target: string;
  payload: unknown;
  timestamp: string;
}
