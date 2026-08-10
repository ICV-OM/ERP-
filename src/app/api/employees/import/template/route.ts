import ExcelJS from "exceljs";
import { requireApiUser } from "@/lib/session";
import { safeJsonError } from "@/lib/security";

const HEADERS = [
  "employeeNo","firstName","lastName","workEmail","phone","jobTitle",
  "departmentCode","branchCode","employmentType","hireDate","status"
];

export async function GET() {
  const auth = await requireApiUser("employee:write");
  if (!auth.ok) return safeJsonError(auth.message, auth.status);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ALTURUD People ERP";
  workbook.created = new Date();

  const employees = workbook.addWorksheet("Employees", { views: [{ state: "frozen", ySplit: 1 }] });
  employees.addRow(HEADERS);
  employees.addRow(["ALT-1001","Ahmed","Al Balushi","ahmed@alturud.com","+96890000000","Operations Coordinator","OPS","MCT","FULL_TIME","2026-08-10","ACTIVE"]);
  employees.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  employees.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E5552" } };
  employees.columns = [16,18,18,30,18,28,18,16,18,16,16].map(width => ({ width }));
  employees.getColumn(9).eachCell((cell, rowNumber) => { if (rowNumber > 1) cell.dataValidation = { type: "list", allowBlank: false, formulae: ['"FULL_TIME,PART_TIME,CONTRACT,TEMPORARY"'] }; });
  employees.getColumn(11).eachCell((cell, rowNumber) => { if (rowNumber > 1) cell.dataValidation = { type: "list", allowBlank: false, formulae: ['"ACTIVE,ON_LEAVE,SUSPENDED,TERMINATED"'] }; });

  const guide = workbook.addWorksheet("Instructions", { views: [{ state: "frozen", ySplit: 1 }] });
  guide.addRow(["الحقل / Field", "التعليمات / Instructions"]);
  [["employeeNo","إلزامي وفريد / Required and unique"],["firstName","الاسم الأول / First name"],["lastName","اسم العائلة / Last name"],["workEmail","بريد وظيفي صحيح وفريد / Valid unique work email"],["phone","اختياري / Optional"],["jobTitle","المسمى الوظيفي / Job title"],["departmentCode","رمز إدارة موجود بالنظام أو فارغ / Existing department code or blank"],["branchCode","رمز فرع موجود بالنظام أو فارغ / Existing branch code or blank"],["employmentType","FULL_TIME | PART_TIME | CONTRACT | TEMPORARY"],["hireDate","YYYY-MM-DD"],["status","ACTIVE | ON_LEAVE | SUSPENDED | TERMINATED"]].forEach(r => guide.addRow(r));
  guide.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  guide.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E5552" } };
  guide.getColumn(1).width = 24; guide.getColumn(2).width = 70; guide.getColumn(2).alignment = { wrapText: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(Buffer.from(buffer), { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="ALTURUD_Employee_Import_Template.xlsx"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
