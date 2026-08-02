import { BaseAgent } from "./base-agent";
import { Role, type TaskAssignment, type AgentMessage } from "../types/roles";

export class Director extends BaseAgent {
  private taskQueue: TaskAssignment[] = [];

  constructor(id: string = "dir-001") {
    super(id, Role.Director, "QUANTICO-ACTUAL");
  }

  async handleTask(task: TaskAssignment): Promise<TaskAssignment> {
    console.log(`[${this.codename}] Received case: ${task.objective}`);
    this.taskQueue.push({ ...task, status: "active" });
    return { ...task, status: "active" };
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    console.log(`[${this.codename}] Intel from ${message.from}: ${message.type}`);
  }

  delegate(objective: string, targetRole: Role, priority: TaskAssignment["priority"] = "medium"): TaskAssignment | null {
    if (!this.canDelegate(targetRole)) {
      console.error(`[${this.codename}] Cannot delegate to ${targetRole} — insufficient clearance differential`);
      return null;
    }
    const task: TaskAssignment = {
      taskId: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assignedTo: targetRole,
      assignedBy: this.identity.role,
      objective,
      priority,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.taskQueue.push(task);
    console.log(`[${this.codename}] Delegated to ${targetRole}: ${objective}`);
    return task;
  }

  getActiveTaskCount(): number {
    return this.taskQueue.filter((t) => t.status === "active" || t.status === "pending").length;
  }
}
