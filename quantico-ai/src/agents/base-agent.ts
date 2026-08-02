import { Role, ROLE_HIERARCHY, type AgentIdentity, type TaskAssignment, type AgentMessage } from "../types/roles";

export abstract class BaseAgent {
  readonly identity: AgentIdentity;

  constructor(id: string, role: Role, codename: string) {
    const roleConfig = ROLE_HIERARCHY[role];
    this.identity = {
      id,
      role,
      codename,
      capabilities: roleConfig.capabilities,
      clearanceLevel: roleConfig.clearanceLevel,
    };
  }

  get role(): Role {
    return this.identity.role;
  }

  get codename(): string {
    return this.identity.codename;
  }

  canDelegate(targetRole: Role): boolean {
    const myLevel = ROLE_HIERARCHY[this.identity.role].clearanceLevel;
    const targetLevel = ROLE_HIERARCHY[targetRole].clearanceLevel;
    return myLevel > targetLevel;
  }

  hasCapability(capability: string): boolean {
    return this.identity.capabilities.includes(capability);
  }

  createMessage(to: Role | "broadcast", type: AgentMessage["type"], payload: unknown): AgentMessage {
    return {
      from: this.identity.role,
      to,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  abstract handleTask(task: TaskAssignment): Promise<TaskAssignment>;
  abstract handleMessage(message: AgentMessage): Promise<void>;
}
