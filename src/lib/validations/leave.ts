import { z } from "zod";

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().trim().max(500).optional().default("")
}).refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
  message: "End date must be on or after start date",
  path: ["endDate"]
});
