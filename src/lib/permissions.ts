export const ROLES = [
  "SUPER_ADMIN","HR_ADMIN","HR_MANAGER","MANAGER","PAYROLL","RECRUITER","EMPLOYEE","AUDITOR"
] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "dashboard:view"
  | "employee:read" | "employee:write"
  | "organization:read" | "organization:write"
  | "attendance:read" | "attendance:write"
  | "shifts:read" | "shifts:write"
  | "leave:read" | "leave:write" | "leave:approve"
  | "payroll:read" | "payroll:write"
  | "recruitment:read" | "recruitment:write"
  | "performance:read" | "performance:write"
  | "documents:read" | "documents:write"
  | "training:read" | "training:write"
  | "assets:read" | "assets:write"
  | "requests:read" | "requests:write"
  | "reports:view"
  | "admin:manage" | "branding:manage" | "audit:read"
  | "relations:read" | "relations:write"
  | "offboarding:read" | "offboarding:write"
  | "workforce:read" | "workforce:write"
  | "approvals:read" | "approvals:write";

const ALL: Permission[] = [
  "dashboard:view","employee:read","employee:write","organization:read","organization:write",
  "attendance:read","attendance:write","shifts:read","shifts:write",
  "leave:read","leave:write","leave:approve","payroll:read","payroll:write",
  "recruitment:read","recruitment:write","performance:read","performance:write",
  "documents:read","documents:write","training:read","training:write","assets:read","assets:write",
  "requests:read","requests:write","reports:view","admin:manage","branding:manage","audit:read",
  "relations:read","relations:write","offboarding:read","offboarding:write",
  "workforce:read","workforce:write","approvals:read","approvals:write"
];

const without = (blocked: Permission[]) => ALL.filter(p => !blocked.includes(p));

const MAP: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  HR_ADMIN: without(["admin:manage"]),
  HR_MANAGER: without(["admin:manage","branding:manage"]),
  MANAGER: [
    "dashboard:view","employee:read","organization:read","attendance:read","attendance:write",
    "shifts:read","shifts:write","leave:read","leave:write","leave:approve",
    "performance:read","performance:write","training:read","workforce:read","workforce:write",
    "requests:read","requests:write","reports:view","approvals:read","approvals:write"
  ],
  PAYROLL: ["dashboard:view","employee:read","organization:read","attendance:read","payroll:read","payroll:write","reports:view"],
  RECRUITER: ["dashboard:view","employee:read","organization:read","recruitment:read","recruitment:write","documents:read","reports:view"],
  EMPLOYEE: [
    "dashboard:view","employee:read","attendance:read","leave:read","leave:write",
    "performance:read","documents:read","training:read","assets:read","requests:read","requests:write"
  ],
  AUDITOR: [
    "dashboard:view","employee:read","organization:read","attendance:read","shifts:read","leave:read",
    "payroll:read","recruitment:read","performance:read","documents:read","training:read","assets:read",
    "requests:read","reports:view","audit:read","relations:read","offboarding:read","workforce:read","approvals:read"
  ]
};

export function can(role: Role, permission: Permission) {
  return MAP[role]?.includes(permission) ?? false;
}
