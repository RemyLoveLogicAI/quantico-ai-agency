export function filterIssues(issues, filters) {
  const query = filters.query.trim().toLowerCase();
  return issues.filter(issue =>
    (!query || [issue.identifier, issue.title, issue.description, issue.assignee].some(value => String(value ?? "").toLowerCase().includes(query))) &&
    (!filters.status || issue.status === filters.status) &&
    (!filters.priority || issue.priority === filters.priority) &&
    (!filters.assignee || (filters.assignee === "unassigned" ? !issue.assigneeAgentId : issue.assigneeAgentId === filters.assignee)));
}
