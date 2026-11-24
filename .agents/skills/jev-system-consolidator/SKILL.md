---
name: jev-system-consolidator
description: "Primary orchestration router across your agent ecosystem. Consolidates 52 modular skills into 6 Master Pillars with sub-millisecond System One routing, cross-pillar DAG synthesis, and strict input/output contracts."
---

# `jev-system-consolidator`: Master Pillar Architecture & Routing Topology

`jev-system-consolidator` is the primary orchestration router across the agent mesh. It consolidates 52 modular skills into **6 Master Pillars**, establishing deterministic execution boundaries, eliminating prompt bloat, and enforcing strict input/output contracts between phases.

---

## 1. Master Pillar Architecture & Skill Taxonomy

| # | Master Pillar | Routing Key | Focus & Technical Domain | Mapped Skills (52 Total) | Primary Deliverable Contracts |
|---|---|---|---|---|---|
| **1** | **Autonomous Engineering & OMAG Core** | `omag-core` | PRD persistence loops, AST guardrails, consensus planning, telemetry & session hygiene. | `oh-my-antigravity`, `omag-ralph`, `omag-ralplan`, `omag-ultragoal`, `omag-team`, `omag-doctor`, `omag-deslop`, `omag-hud` | Test-verified PRD execution loops (`passes: true`), RALPLAN consensus briefs, durable milestone ledgers (`goals.json`), and clean exit codes (`0`). |
| **2** | **Systems, Agent Architectures & GenUI** | `agent-architect` | Multi-agent swarms, bot architectures, runtime adapters, and dynamic generative card surfaces. | `lovelogicai-agent-architect`, `agent-surface`, `generative-ui-architect`, `my-ai-tools`, `swarm-orchestrator`, `code-architect`, `api-integrator`, `cloud-bot-orchestrator` | Bot-team topology specs (Grok Bot, Hark, Muse, Poke, oS3), typed tool adapters, CRDT synchronization cores, and Generative Card JSON schemas. |
| **3** | **Tooling, Scaffolding & Release Engine** | `dev-tooling` | CLI/TUI generation, MCP servers, plugin manifests, multi-registry packaging, and chaos/security audits. | `expert-cli-creator`, `expert-mcp-creator`, `expert-plugin-creator`, `package-and-publish`, `project-finisher`, `reverse-engineer`, `expert-skill-maker`, `security-auditor`, `chaos-engineer` | Production-grade CLIs/TUIs, stdio/SSE MCP servers, plugin registries, automated multi-registry releases (npm, PyPI, Homebrew), and vulnerability reports. |
| **4** | **Personal Operations & Concierge** | `ops-concierge` | Energy-demand task matching, meeting briefs, Mac activity telemetry, and telephony integration. | `prep-for-meetings`, `focus-my-energy`, `executive-assistant`, `call-me`, `pikastream-video-meeting`, `free-trial-watchdog`, `managemymac-activity-bridge`, `project-manager`, `telegram-agent-01` | 30-second pre-meeting briefing cards, circadian cognitive-energy task scheduling, CallKit audio bridges, subscription audits, and host telemetry. |
| **5** | **Advisory, Deliberation & Intelligence** | `strategic-advisory` | Multi-perspective advisory panels, scenario trees, market intelligence, and literature synthesis. | `rigorous-evaluator`, `get-more-perspectives`, `quantum-state-engine`, `market-researcher`, `financial-analyst`, `academic-researcher`, `trend-radar`, `learning-path-designer` | 5-Advisor consensus briefs (Operator, Skeptic, Visionary, Customer, Finance), Monte Carlo scenario paths, competitive SWOT matrices, and citations. |
| **6** | **Voice, Narrative & Multimodal Studio** | `creative-studio` | Personal voice mimicry, brand positioning, generative video styling, wearable HUD surfaces, and visual analytics. | `match-my-writing-style`, `brand-storyteller`, `omni-channel-strategist`, `seo-strategist`, `viral-trend-recreator`, `reelmimic-studio`, `generate-fresh-ideas`, `rick-and-morty-persona`, `data-visualizer`, `even-realities-g2-sdk` | Persistent Voice Card prose drafts, viral storyboard sequences, ReelMimic animation pipelines, Even Realities G2 BLE surfaces, and interactive charts. |

---

## 2. Cross-Pillar Execution Topology

```
                         ┌─────────────────────────────────────────┐
                         │         jev-system-consolidator         │
                         │   System 1 Fast Router / Jev Mesh Core   │
                         └────────────────────┬────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              ▼                               ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
     │   Pillar 5:     │  Strategy   │   Pillar 2:     │   Schema    │   Pillar 1:     │
     │   Advisory &    ├────────────►│   Systems &     ├────────────►│   OMAG Core     │
     │   Intelligence  │  Dossier    │   Agent Arch    │  Contract   │   Build/Verify  │
     └─────────────────┘             └─────────────────┘             └────────┬────────┘
                                                                              │
                                     Verified Commits & Test Ledger           │
              ┌───────────────────────────────────────────────────────────────┘
              ▼
     ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
     │   Pillar 3:     │  Shipped    │   Pillar 6:     │   Launch    │   Pillar 4:     │
     │   Tooling &     ├────────────►│   Creative &    ├────────────►│   Operations &  │
     │   Release       │  Binaries   │   Multimodal    │   Campaign  │   Telemetry     │
     └────────┬────────┘             └─────────────────┘             └────────┬────────┘
              │                                                               │
              └─────────────── Continuous Feedback & Telemetry ───────────────┘
```

### End-to-End Pipeline Stages & Data Contracts:
1. **Strategic Inception (`Pillar 5`)**: Ingests requirements, executes multi-perspective deliberation, and emits a structured strategy memo with falsifiable hypotheses.
2. **System Specification (`Pillar 2`)**: Formalizes architectural topology, data boundaries, tool schemas, and Generative UI component definitions.
3. **Autonomous Construction (`Pillar 1`)**: Executes code generation via OMAG Ralph persistence loops under non-bypassable AST verification and test assertions (`exit 0`).
4. **Distribution & Packaging (`Pillar 3`)**: Scaffolds CLI/MCP interfaces, executes chaos and vulnerability audits, and publishes signed release artifacts.
5. **Expression & Launch (`Pillar 6`)**: Produces brand-aligned documentation, launch narratives, visual assets, and wearable display adapters matching your voice signature.
6. **Operational Telemetry (`Pillar 4`)**: Monitors runtime vitals, enforces subscription watchdogs, and feeds live performance telemetry back into Pillars 1 and 5.

---

## 3. Consolidation Phasing & Routing Protocols

- **Phase 1 (Active — Fast-Path Router)**:
  - Route directly by canonical pillar keys: `omag-core`, `agent-architect`, `dev-tooling`, `ops-concierge`, `strategic-advisory`, `creative-studio`.
  - Sub-millisecond latency (< 1ms locally, < 0.2ms deterministic gate).
- **Phase 2 (Sub-Skill Directory Bundling)**:
  - Auxiliary scripts, schemas, and references are organized under pillar modules to eliminate context fragmentation.
- **Phase 3 (Zero-Downtime Aliasing)**:
  - Any of the 52 legacy skill triggers acts as a single-hop pass-through alias pointing directly to its parent Master Pillar.

---

## 4. CLI Usage & Operations

```bash
# 1. Inspect all 6 Master Pillars and mapped skills
bun run cli/index.ts consolidate

# 2. Route directly to a Master Pillar
bun run cli/index.ts pillar "omag-core"
bun run cli/index.ts pillar "Design microservices architecture for multi-agent bot swarms"

# 3. Synthesize a 6-phase cross-pillar execution topology DAG
bun run cli/index.ts topology "End-to-end full initiative deployment"

# 4. Standard prompt routing with Master Pillar annotation
bun run cli/index.ts route "Audit CVE-2024-4577 and publish package"
```

---

## 5. Disambiguation Protocol (OH HAI)

When confidence margin $\Delta < 0.15$ or confidence $< 0.65$:
- Router triggers `status: disambiguation_needed`.
- Auto-generates an operator ask:
  ```bash
  oh-hai ask submit --mode select --title "Clarify Master Pillar route" --options "Pillar 1: Autonomous Engineering" "Pillar 2: Systems Architecture"
  ```
