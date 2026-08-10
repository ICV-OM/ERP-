import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireApiUser } from "@/lib/session";
import { employeeSchema } from "@/lib/validations/employee";
import { assertCsrf, safeJsonError } from "@/lib/security";
import { query, withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;
const REQUIRED_HEADERS = ["employeeNo","firstName","lastName","workEmail","phone","jobTitle","departmentCode","branchCode","employmentType","hireDate","status"] as const;

type RawRow = Record<(typeof REQUIRED_HEADERS)[number], string>;

function text(cell: ExcelJS.Cell) {
  if (cell.type === ExcelJS.ValueType.Formula) throw new Error("FORMULA_NOT_ALLOWED");
  const v = cell.value;
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text.trim();
    if ("result" in v || "formula" in v) throw new Error("FORMULA_NOT_ALLOWED");
  }
  return String(v).trim();
}

export async function POST(request: NextRequest) {
  try { assertCsrf(request); } catch { return safeJsonError("Request rejected", 403); }
  const a = await requireApiUser("employee:write");
  if (!a.ok) return safeJsonError(a.message, a.status);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return safeJsonError("Excel file is required", 400);
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return safeJsonError("File must be 5 MB or smaller", 413);
  if (!/\.xlsx$/i.test(file.name)) return safeJsonError("Only .xlsx files are allowed", 415);

  const workbook = new ExcelJS.Workbook();
  try {
    const excelBuffer = Buffer.from(await file.arrayBuffer());
    // ExcelJS currently ships Buffer typings that can conflict with newer Node typings.
    // Runtime input is a genuine Node Buffer; keep the compatibility cast isolated here.
    await workbook.xlsx.load(excelBuffer as any);
  } catch {
    return safeJsonError("Invalid or corrupted Excel file", 422);
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return safeJsonError("Workbook has no worksheet", 422);

  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => headerMap.set(String(cell.value ?? "").trim(), col));
  for (const h of REQUIRED_HEADERS) if (!headerMap.has(h)) return safeJsonError(`Missing required column: ${h}`, 422);

  const usableRows = Math.max(0, sheet.actualRowCount - 1);
  if (usableRows === 0) return safeJsonError("The workbook contains no employee rows", 422);
  if (usableRows > MAX_ROWS) return safeJsonError(`Maximum ${MAX_ROWS} employee rows per import`, 422);

  const rows: { rowNo:number; raw:RawRow }[] = [];
  const errors: { row:number; message:string }[] = [];
  const employeeNos = new Set<string>();
  const emails = new Set<string>();

  for (let rowNo=2; rowNo<=sheet.actualRowCount; rowNo++) {
    const row = sheet.getRow(rowNo);
    const raw = {} as RawRow;
    try {
      for (const h of REQUIRED_HEADERS) raw[h] = text(row.getCell(headerMap.get(h)!));
    } catch {
      errors.push({row:rowNo,message:"Formulas are not allowed in import cells"});
      continue;
    }
    if (REQUIRED_HEADERS.every(h => !raw[h])) continue;
    const no = raw.employeeNo.toUpperCase();
    const email = raw.workEmail.toLowerCase();
    if (employeeNos.has(no)) errors.push({row:rowNo,message:"Duplicate employeeNo inside file"});
    if (emails.has(email)) errors.push({row:rowNo,message:"Duplicate workEmail inside file"});
    employeeNos.add(no); emails.add(email);
    rows.push({rowNo,raw});
  }
  if (errors.length) return Response.json({ok:false,error:"Validation failed",errors:errors.slice(0,100)},{status:422,headers:{"Cache-Control":"no-store"}});
  if (!rows.length) return safeJsonError("The workbook contains no employee rows", 422);

  const [departments, branches] = await Promise.all([
    query<{id:string;code:string}>("SELECT id,code FROM departments WHERE organization_id=$1 AND is_active=TRUE",[a.user.organizationId]),
    query<{id:string;code:string}>("SELECT id,code FROM branches WHERE organization_id=$1 AND is_active=TRUE",[a.user.organizationId])
  ]);
  const dept = new Map(departments.rows.map(x=>[x.code.toUpperCase(),x.id]));
  const branch = new Map(branches.rows.map(x=>[x.code.toUpperCase(),x.id]));

  const parsedRows: {rowNo:number;data:ReturnType<typeof employeeSchema.parse>}[] = [];
  for (const item of rows) {
    const d = item.raw;
    const departmentId = d.departmentCode ? dept.get(d.departmentCode.toUpperCase()) : undefined;
    const branchId = d.branchCode ? branch.get(d.branchCode.toUpperCase()) : undefined;
    if (d.departmentCode && !departmentId) { errors.push({row:item.rowNo,message:`Unknown departmentCode: ${d.departmentCode}`}); continue; }
    if (d.branchCode && !branchId) { errors.push({row:item.rowNo,message:`Unknown branchCode: ${d.branchCode}`}); continue; }
    const parsed = employeeSchema.safeParse({
      employeeNo:d.employeeNo, firstName:d.firstName, lastName:d.lastName, workEmail:d.workEmail,
      phone:d.phone, jobTitle:d.jobTitle, departmentId:departmentId ?? null, branchId:branchId ?? null,
      employmentType:d.employmentType, hireDate:d.hireDate, status:d.status || "ACTIVE"
    });
    if (!parsed.success) { errors.push({row:item.rowNo,message:parsed.error.issues[0]?.message ?? "Invalid row"}); continue; }
    parsedRows.push({rowNo:item.rowNo,data:parsed.data});
  }
  if (errors.length) return Response.json({ok:false,error:"Validation failed",errors:errors.slice(0,100)},{status:422,headers:{"Cache-Control":"no-store"}});

  try {
    const inserted = await withTransaction(async c => {
      const existing = await c.query<{employee_no:string;work_email:string}>(
        `SELECT employee_no,work_email FROM employees WHERE organization_id=$1 AND deleted_at IS NULL AND (employee_no = ANY($2::text[]) OR lower(work_email)=ANY($3::text[]))`,
        [a.user.organizationId, parsedRows.map(x=>x.data.employeeNo), parsedRows.map(x=>x.data.workEmail.toLowerCase())]
      );
      if (existing.rowCount) throw Object.assign(new Error("DUPLICATE_DB"),{code:"DUPLICATE_DB"});
      const ids:string[]=[];
      for (const item of parsedRows) {
        const d=item.data;
        const r=await c.query<{id:string}>(`INSERT INTO employees(organization_id,employee_no,first_name,last_name,work_email,phone,job_title,department_id,branch_id,employment_type,hire_date,status,created_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,[
          a.user.organizationId,d.employeeNo,d.firstName,d.lastName,d.workEmail.toLowerCase(),d.phone||null,d.jobTitle,d.departmentId||null,d.branchId||null,d.employmentType,d.hireDate,d.status,a.user.id
        ]);
        ids.push(r.rows[0].id);
      }
      return ids;
    });
    await audit({organizationId:a.user.organizationId,actorUserId:a.user.id,action:"employee.bulk_import",entityType:"employee_import",entityId:crypto.randomUUID(),after:{count:inserted.length,sourceFile:file.name},requestId:request.headers.get("x-request-id")});
    return Response.json({ok:true,imported:inserted.length},{status:201,headers:{"Cache-Control":"no-store"}});
  } catch (e:any) {
    if (e?.code === "DUPLICATE_DB" || e?.code === "23505") return safeJsonError("One or more employee numbers or work emails already exist",409);
    return safeJsonError("Unable to import employees",500);
  }
}
