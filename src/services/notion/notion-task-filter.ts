export interface TaskFilter {
  dateMin: string | null;
  dateMax: string | null;
  assignee: string | null;
  developer: string | null;
  reviewer: string | null;
  status: string | null;
  title: string | null;
}

export function buildTaskFilter(f: TaskFilter): Record<string, unknown> | undefined {
  const conditions: Record<string, unknown>[] = [];

  if (f.dateMin) conditions.push({ property: "Date", date: { on_or_after: f.dateMin } });
  if (f.dateMax) conditions.push({ property: "Date", date: { on_or_before: f.dateMax } });
  if (f.assignee) conditions.push({ property: "Assignee", relation: { contains: f.assignee } });
  if (f.developer) conditions.push({ property: "Developer", relation: { contains: f.developer } });
  if (f.reviewer) conditions.push({ property: "Reviewer", relation: { contains: f.reviewer } });
  if (f.status) conditions.push({ property: "Status", status: { equals: f.status } });
  if (f.title) conditions.push({ property: "Name", title: { contains: f.title } });

  if (!conditions.length) return undefined;
  return conditions.length === 1 ? conditions[0] : { and: conditions };
}
