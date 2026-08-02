/**
 * Quantico-AI Role Hierarchy
 *
 * Director           — Top-level orchestrator; delegates tasks, aggregates intel
 * Forensic Accountant — Financial trail analysis, ledger reconciliation, anomaly detection
 * Digital Sleuth      — OSINT, digital footprint tracing, metadata extraction
 * Recon Specialist    — Preliminary reconnaissance, target profiling, data sourcing
 */

export enum Role {
  Director = "director",
  ForensicAccountant = "forensic_accountant",
  DigitalSleuth = "digital_sleuth",
  ReconSpecialist = "recon_specialist",
}

export interface AgentIdentity {
  id: string;
  role: Role;
  codename: string;
  capabilities: string[];
  clearanceLevel: number; // 1 (Recon) → 4 (Director)
}

export interface TaskAssignment {
  taskId: string;
  assignedTo: Role;
  assignedBy: Role;
  objective: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "active" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  artifacts?: string[];
}

export interface AgentMessage {
  from: Role;
  to: Role | "broadcast";
  type: "directive" | "report" | "intel" | "alert";
  payload: unknown;
  timestamp: string;
}

export const ROLE_HIERARCHY: Record<Role, { clearanceLevel: number; reportsTo: Role | null; capabilities: string[] }> = {
  [Role.Director]: {
    clearanceLevel: 4,
    reportsTo: null,
    capabilities: [
      "task_delegation",
      "intel_aggregation",
      "case_management",
      "agent_orchestration",
      "final_assessment",
    ],
  },
  [Role.ForensicAccountant]: {
    clearanceLevel: 3,
    reportsTo: Role.Director,
    capabilities: [
      "ledger_analysis",
      "transaction_tracing",
      "anomaly_detection",
      "financial_modeling",
      "audit_trail_construction",
    ],
  },
  [Role.DigitalSleuth]: {
    clearanceLevel: 3,
    reportsTo: Role.Director,
    capabilities: [
      "osint_collection",
      "metadata_extraction",
      "digital_footprint_analysis",
      "entity_resolution",
      "link_analysis",
    ],
  },
  [Role.ReconSpecialist]: {
    clearanceLevel: 2,
    reportsTo: Role.Director,
    capabilities: [
      "target_profiling",
      "data_sourcing",
      "preliminary_assessment",
      "perimeter_mapping",
      "surface_scan",
    ],
  },
};
