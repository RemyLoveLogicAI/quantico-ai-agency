import { BaseAgent } from "./base-agent";
import { Role, type TaskAssignment, type AgentMessage } from "../types/roles";

export class ForensicAccountant extends BaseAgent {
  constructor(id: string = "fa-001") {
    super(id, Role.ForensicAccountant, "LEDGER");
  }

  async handleTask(task: TaskAssignment): Promise<TaskAssignment> {
    console.log(`[${this.codename}] Analyzing financial trail: ${task.objective}`);
    return { ...task, status: "active" };
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    if (message.type === "directive") {
      console.log(`[${this.codename}] Directive received from ${message.from}`);
    } else if (message.type === "intel") {
      console.log(`[${this.codename}] Cross-referencing intel from ${message.from}`);
    }
  }
}
