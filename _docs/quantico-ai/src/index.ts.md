<!-- METADATA: {"source_path": "quantico-ai/src/index.ts", "source_sha": "", "extraction_quality": "regex_fallback", "model": "gpt-5-mini", "generated_at": "2026-07-04T11:38:22Z", "doc_type": "file"} -->
<details>
<summary>Documentation Metadata (click to expand)</summary>

```json
{
  "doc_type": "file_overview",
  "file_path": "quantico-ai/src/index.ts",
  "source_hash": "a79dff4bb91ead63654c12b9fb2ca38a6f955feb3b57f6b66435f4e539f867a8",
  "last_updated": "2026-07-04T11:38:22.375705+00:00",
  "tokens_used": 839,
  "complexity_score": 1,
  "estimated_review_time_minutes": 5,
  "external_dependencies": [
    "import { Hono } from \"hono\";",
    "import { logger } from \"hono/logger\";",
    "import { health } from \"./routes/health\";",
    "import { agents } from \"./routes/agents\";",
    "import { createCleanRoomGateway } from \"./gateway/clean-room\";",
    "import { ZoConnector } from \"./gateway/zo-connector\";",
    "import { getGatewayConfig, GATEWAY_PORT, GATEWAY_HOST } from \"../config/defaults\";",
    "import { Director } from \"./agents/director\";",
    "import { ForensicAccountant } from \"./agents/forensic-accountant\";",
    "import { DigitalSleuth } from \"./agents/digital-sleuth\";",
    "import { ReconSpecialist } from \"./agents/recon-specialist\";"
  ]
}
```

</details>

[Documentation Home](../../README.md) > [quantico-ai](../README.md) > [src](./README.md) > **index**

---

# index.ts

> **File:** `quantico-ai/src/index.ts`

![Complexity: Low](https://img.shields.io/badge/Complexity-Low-green) ![Review Time: 5min](https://img.shields.io/badge/Review_Time-5min-blue)

## 📑 Table of Contents


- [Overview](#overview)
- [Dependencies](#dependencies)
- [Architecture Notes](#architecture-notes)
- [Maintenance Notes](#maintenance-notes)
- [Functions and Classes](#functions-and-classes)

---

## Overview

This TypeScript module appears to be the application entry point that wires together an HTTP server and the various application components. It imports the Hono web framework and a logger middleware, route handlers for health checks and agent-related endpoints, gateway construction utilities and connectors, configuration defaults (including host and port), and several agent implementations. The file's role is to bring these pieces together so the service can expose web routes and interact with backend gateways and agent logic according to the provided configuration.

  While the file contents themselves are not provided, the import list indicates orchestration responsibilities: registering middleware and routes with Hono, constructing or configuring a gateway (including a clean-room gateway and a Zo connector), and referencing agent classes such as Director, ForensicAccountant, DigitalSleuth, and ReconSpecialist that are likely used by the routes or gateway layer to implement domain behavior.

## Dependencies

### External Dependencies

| Module | Usage |
| --- | --- |
| `import { Hono } from "hono";` | import { Hono } from "hono"; |
| `import { logger } from "hono/logger";` | import { logger } from "hono/logger"; |
| `import { health } from "./routes/health";` | import { health } from "./routes/health"; |
| `import { agents } from "./routes/agents";` | import { agents } from "./routes/agents"; |
| `import { createCleanRoomGateway } from "./gateway/clean-room";` | import { createCleanRoomGateway } from "./gateway/clean-room"; |
| `import { ZoConnector } from "./gateway/zo-connector";` | import { ZoConnector } from "./gateway/zo-connector"; |
| `import { getGatewayConfig, GATEWAY_PORT, GATEWAY_HOST } from "../config/defaults";` | import { getGatewayConfig, GATEWAY_PORT, GATEWAY_HOST } from "../config/defaults"; |
| `import { Director } from "./agents/director";` | import { Director } from "./agents/director"; |
| `import { ForensicAccountant } from "./agents/forensic-accountant";` | import { ForensicAccountant } from "./agents/forensic-accountant"; |
| `import { DigitalSleuth } from "./agents/digital-sleuth";` | import { DigitalSleuth } from "./agents/digital-sleuth"; |
| `import { ReconSpecialist } from "./agents/recon-specialist";` | import { ReconSpecialist } from "./agents/recon-specialist"; |

## 📁 Directory

This file is part of the **src** directory. View the [directory index](_docs/quantico-ai/src/README.md) to see all files in this module.

## Architecture Notes

- Uses the Hono web framework for HTTP routing and middleware.
- Separates route handlers into modular route modules (health, agents).
- Uses factory-style gateway construction (createCleanRoomGateway) and connector abstraction (ZoConnector).
- Pulls runtime configuration (host, port, gateway config) from a centralized defaults module.
- Documentation generated from regex-based extraction for TypeScript; class/function detection is best-effort.

## Maintenance Notes

- Register and configure HTTP routes and middleware using the Hono framework and logger.
- Bring in and expose health and agent-related routes for the web service.
- Construct or configure gateway components, including a clean-room gateway and a Zo connector, using configuration defaults.
- Reference agent implementations (Director, ForensicAccountant, DigitalSleuth, ReconSpecialist) for use within request handling or gateway interactions.

---

## Navigation

**↑ Parent Directory:** [Go up](_docs/quantico-ai/src/README.md)

---

*This documentation was automatically generated by AI ([Woden DocBot](https://github.com/marketplace/ai-document-creator)) and may contain errors. It is the responsibility of the user to validate the accuracy and completeness of this documentation.*
