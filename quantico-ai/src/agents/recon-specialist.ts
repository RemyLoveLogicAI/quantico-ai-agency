import { BaseAgent } from "./base-agent";
import { Role, type TaskAssignment, type AgentMessage } from "../types/roles";

export class ReconSpecialist extends BaseAgent {
  constructor(id: string = "rs-001") {
    super(id, Role.ReconSpecialist, "OVERWATCH");
  }

  async handleTask(task: TaskAssignment): Promise<TaskAssignment> {
    console.log(`[${this.codename}] Beginning reconnaissance: ${task.objective}`);
    return { ...task, status: "active" };
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    if (message.type === "directive") {
      console.log(`[${this.codename}] Directive received from ${message.from}`);
    } else if (message.type === "alert") {
      console.log(`[${this.codename}] Alert escalated from ${message.from}`);
    }
  }
}
