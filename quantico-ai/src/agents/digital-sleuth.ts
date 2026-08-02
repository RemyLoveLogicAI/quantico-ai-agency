import { BaseAgent } from "./base-agent";
import { Role, type TaskAssignment, type AgentMessage } from "../types/roles";

export class DigitalSleuth extends BaseAgent {
  constructor(id: string = "ds-001") {
    super(id, Role.DigitalSleuth, "GHOST");
  }

  async handleTask(task: TaskAssignment): Promise<TaskAssignment> {
    console.log(`[${this.codename}] Initiating digital trace: ${task.objective}`);
    return { ...task, status: "active" };
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    if (message.type === "directive") {
      console.log(`[${this.codename}] Directive received from ${message.from}`);
    } else if (message.type === "intel") {
      console.log(`[${this.codename}] Processing OSINT feed from ${message.from}`);
    }
  }
}
