export const ROLES = [
  "SUPER_ADMIN",
  "HR_ADMIN",
  "HR_MANAGER",
  "MANAGER",
  "PAYROLL",
  "RECRUITER",
  "EMPLOYEE",
  "AUDITOR"
] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "dashboard:view"
  | "employee:read"
  | "employee:write"
  | "attendance:read"
  | "attendance:write"
  | "leave:read"
  | "leave:write"
  | "leave:approve"
  | "payroll:read"
  | "payroll:write"
  | "recruitment:read"
  | "recruitment:write"
  | "performance:read"
  | "performance:write"
  | "documents:read"
  | "documents:write"
  | "reports:view"
  | "admin:manage"
  | "audit:read"
  | "relations:read"
  | "offboarding:read"
  | "workforce:read"
  | "approvals:read";

const ALL: Permission[] = [
  "dashboard:view", "employee:read", "employee:write", "attendance:read", "attendance:write",
  "leave:read", "leave:write", "leave:approve", "payroll:read", "payroll:write",
  "recruitment:read", "recruitment:write", "performance:read", "performance:write",
  "documents:read", "documents:write", "reports:view", "admin:manage", "audit:read", "relations:read", "offboarding:read", "workforce:read", "approvals:read"
];

const MAP: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  HR_ADMIN: ALL.filter((p) => p !== "admin:manage"),
  HR_MANAGER: ALL.filter((p) => !["admin:manage"].includes(p)),
  MANAGER: ["dashboard:view", "employee:read", "attendance:read", "leave:read", "leave:write", "leave:approve", "performance:read", "performance:write", "reports:view", "workforce:read", "approvals:read"],
  PAYROLL: ["dashboard:view", "employee:read", "attendance:read", "payroll:read", "payroll:write", "reports:view"],
  RECRUITER: ["dashboard:view", "employee:read", "recruitment:read", "recruitment:write", "documents:read"],
  EMPLOYEE: ["dashboard:view", "employee:read", "attendance:read", "leave:read", "leave:write", "performance:read", "documents:read"],
  AUDITOR: ["dashboard:view", "employee:read", "attendance:read", "leave:read", "payroll:read", "recruitment:read", "performance:read", "documents:read", "reports:view", "audit:read"]
};

export function can(role: Role, permission: Permission) {
  return MAP[role]?.includes(permission) ?? false;
}
