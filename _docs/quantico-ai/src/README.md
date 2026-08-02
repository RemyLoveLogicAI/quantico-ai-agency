<details><summary>Directory Metadata (for smart change detection)</summary>

```json
{
  "doc_type": "directory_index",
  "directory_path": "_docs/quantico-ai/src",
  "directory_hash": "d12db6426aa93784be6af3b78a4c2fb32842a96bc6cce835562f191b589d050b",
  "file_count": 1,
  "file_hashes": {
    "index.ts": "bef8916b7164479c"
  }
}
```

</details>

[Documentation Home](../../README.md) > [quantico-ai](../README.md) > [src](./README.md) > **src**

---

# 📁 src

> **Purpose:** Holds the Quantico-AI gateway and application entry point code that wires HTTP routing, authentication middleware, agent implementations, and type definitions for the clean-room gateway feature.
> 

![Organization: Layer Based](https://img.shields.io/badge/Organization-Layer_Based-blue)

## 📑 Table of Contents


- [Overview](#overview)
- [Subdirectories](#subdirectories)
- [All Files](#all-files)
- [Dependencies](#dependencies)
- [Architecture Notes](#architecture-notes)

---

## Overview

This directory contains the application entry point (index.ts) and grouped implementation layers for the Quantico-AI gateway and agent surface. At the root, index.ts is the entry point that composes an HTTP server with routing, middleware, and the agent-layer imports, serving as the bootstrap that wires the gateway modules, routes, and authentication into a running application.

Subdirectories break the implementation into focused areas: agents/ contains agent implementations and a barrel export with a BaseAgent and concrete agent modules that together form the system's agent layer; gateway/ holds gateway-level modules for the clean-room feature, including a module that composes routing and a Zo connector and that references the Hono web framework and authentication middleware; middleware/ provides centralized Hono authentication middleware used by routes; routes/ defines HTTP endpoints for agents and health checks; and types/ defines small, focused TypeScript types for gateway interfaces and role modelling. Together, the root entry point and these subdirectories form a layered composition where types inform agent and gateway contracts, middleware enforces authentication, routes expose endpoints, and the index.ts module wires everything into the running HTTP server.


### File Organization

Files are organized by runtime role: a single root entry point (index.ts) composes layers and imports focused subdirectories. Subdirectories group related code: agents implement domain behaviors, gateway modules compose request handling, middleware centralizes auth logic, routes define HTTP endpoints, and types provide shared type definitions.

## 📂 Subdirectories

This directory contains the following subdirectories:

### [📁 agents](./agents/README.md)

**Purpose:** Contains agent implementations and a central export barrel for agent-related types and classes used by the system's agent-based components.

![Files: 6](https://img.shields.io/badge/Files-6-blue)

---

### [📁 gateway](./gateway/README.md)

**Purpose:** Contains gateway-level TypeScript modules for the clean-room feature and a Zo connector, wiring framework middleware and gateway types for request handling.

![Files: 2](https://img.shields.io/badge/Files-2-blue)

---

### [📁 middleware](./middleware/README.md)

**Purpose:** Houses authentication middleware used by the application built on the Hono framework, providing centralized auth checks for routes.

![Files: 1](https://img.shields.io/badge/Files-1-blue)

---

### [📁 routes](./routes/README.md)

**Purpose:** Contains route modules that define HTTP endpoints related to agents and application health checks for the application.

![Files: 2](https://img.shields.io/badge/Files-2-blue)

---

### [📁 types](./types/README.md)

**Purpose:** Collection of TypeScript type definitions used by Quantico-AI for gateway interfaces and role modelling to keep type surface area small, explicit, and reusable.

![Files: 2](https://img.shields.io/badge/Files-2-blue)

---
## 📂 All Files

| File | Type |
| --- | --- |
| [index.ts](./index.ts.md) | 📘 TypeScript |

## Dependencies

### External Dependencies

| Dependency | Usage |
| --- | --- |
| `Hono (web framework)` | Referenced by gateway modules and middleware as the web framework used for routing and middleware composition. |

### Internal Dependencies

| Dependency | Usage |
| --- | --- |
| `agents` | Provides concrete agent implementations and types that index.ts imports and exposes via routes. |
| `gateway` | Composes routing and connectors (including the Zo connector) and wires middleware and routes into the HTTP handling that index.ts starts. |

## Architecture Notes

- Single-entry composition: index.ts acts as the single application bootstrap, importing and wiring agents, gateway composition, middleware, and routes.
- Layer separation: agents, gateway, middleware, routes, and types are kept in separate directories to maintain clear boundaries between domain logic, request handling, auth, and type contracts.
- Types-first contracts: the types/ directory centralizes lightweight gateway and role types to keep runtime code consistent and minimize coupling.

---

## Navigation

**↑ Parent Directory:** [Go up](../README.md)
**🔗 Related:** [agents](./agents/README.md) • [gateway](./gateway/README.md) • [middleware](./middleware/README.md) • [routes](./routes/README.md) • [types](./types/README.md)

---

*Generated by Woden Docbot*