import { z } from "zod";

export const employeeSchema = z.object({
  employeeNo: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  workEmail: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  jobTitle: z.string().trim().min(2).max(120),
  departmentId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"]),
  hireDate: z.string().date(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).default("ACTIVE")
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
