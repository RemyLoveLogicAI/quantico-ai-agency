import type { GatewayConfig } from "../types/gateway";

export interface ZoConnectionStatus {
  connected: boolean;
  url: string;
  lastAttempt: string | null;
  error: string | null;
}

export class ZoConnector {
  private config: GatewayConfig;
  private status: ZoConnectionStatus;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.status = {
      connected: false,
      url: config.zoWorkspaceUrl,
      lastAttempt: null,
      error: null,
    };
  }

  async probe(): Promise<ZoConnectionStatus> {
    this.status.lastAttempt = new Date().toISOString();
    try {
      const response = await fetch(this.config.zoWorkspaceUrl, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" },
        signal: AbortSignal.timeout(5000),
      });
      this.status.connected = response.ok;
      this.status.error = response.ok ? null : `HTTP ${response.status}`;
      console.log(`[ZO] Probe ${this.config.zoWorkspaceUrl} -> ${response.status}`);
    } catch (err) {
      this.status.connected = false;
      this.status.error = err instanceof Error ? err.message : String(err);
      console.log(`[ZO] Probe failed: ${this.status.error}`);
    }
    return { ...this.status };
  }

  async postMcp(payload: unknown, bearerToken: string): Promise<unknown> {
    const response = await fetch(`${this.config.zoWorkspaceUrl}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`ZO MCP error: HTTP ${response.status}`);
    }
    return response.json();
  }

  getStatus(): ZoConnectionStatus {
    return { ...this.status };
  }
}
