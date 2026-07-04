import { Hono } from "hono";
import { logger } from "hono/logger";
import { health } from "./routes/health";
import { agents } from "./routes/agents";
import { createCleanRoomGateway } from "./gateway/clean-room";
import { ZoConnector } from "./gateway/zo-connector";
import { getGatewayConfig, GATEWAY_PORT, GATEWAY_HOST } from "../config/defaults";
import { Director } from "./agents/director";
import { ForensicAccountant } from "./agents/forensic-accountant";
import { DigitalSleuth } from "./agents/digital-sleuth";
import { ReconSpecialist } from "./agents/recon-specialist";

const app = new Hono();
app.use("*", logger());

// Mount routes
app.route("/health", health);
app.route("/api/agents", agents);

// Mount clean-room gateway
const gatewayConfig = getGatewayConfig();
const gateway = createCleanRoomGateway(gatewayConfig);
app.route("/gateway", gateway);

// Zo workspace connector
const zoConnector = new ZoConnector(gatewayConfig);

app.get("/gateway/zo", async (c) => {
  const status = await zoConnector.probe();
  return c.json(status);
});

// Root
app.get("/", (c) => {
  return c.json({
    name: "Quantico-AI Agency",
    version: "0.1.0",
    gateway: { port: GATEWAY_PORT, status: "clean-room" },
    roles: ["director", "forensic_accountant", "digital_sleuth", "recon_specialist"],
  });
});

// Bootstrap agents
const director = new Director();
const forensicAccountant = new ForensicAccountant();
const digitalSleuth = new DigitalSleuth();
const reconSpecialist = new ReconSpecialist();

console.log("--- Quantico-AI Agency ---");
console.log(`Director:            ${director.codename} (clearance ${director.identity.clearanceLevel})`);
console.log(`Forensic Accountant: ${forensicAccountant.codename} (clearance ${forensicAccountant.identity.clearanceLevel})`);
console.log(`Digital Sleuth:      ${digitalSleuth.codename} (clearance ${digitalSleuth.identity.clearanceLevel})`);
console.log(`Recon Specialist:    ${reconSpecialist.codename} (clearance ${reconSpecialist.identity.clearanceLevel})`);
console.log(`Gateway:             port ${GATEWAY_PORT} (clean-room)`);
console.log("-".repeat(26));

// Probe Zo workspace on startup (non-blocking)
zoConnector.probe().then((s) => {
  console.log(`Zo workspace: ${s.connected ? "connected" : "offline"} (${s.url})`);
});

export default {
  port: GATEWAY_PORT,
  hostname: GATEWAY_HOST,
  fetch: app.fetch,
};
