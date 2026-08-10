import type { Permission } from "@/lib/permissions";

export type FieldType = "text"|"email"|"number"|"date"|"datetime-local"|"time"|"textarea"|"select"|"boolean"|"json"|"lookup";
export type SelectOption = { value:string; label:string; labelAr?:string };
export type LookupDef = { table:string; labelSql:string; whereSql?:string; orderBy?:string };
export type WorkspaceField = {
  key:string; column:string; label:string; labelAr:string; type:FieldType;
  required?:boolean; readOnly?:boolean; hidden?:boolean; options?:SelectOption[]; lookup?:LookupDef;
};
export type WorkspaceConfig = {
  table:string; readPermission:Permission; writePermission?:Permission; fields:WorkspaceField[]; listFields?:string[];
  whereSql?:string; orderBy?:string; scopeEmployeeColumn?:string; fixedValues?:Record<string,string|number|boolean>;
  allowCreate?:boolean; allowUpdate?:boolean; allowDelete?:boolean; createdByColumn?:string; updatedByColumn?:string;
};

type TableDef = Omit<WorkspaceConfig,"readPermission"|"writePermission">;
type ScreenDef = { table:keyof typeof tables; readPermission:Permission; writePermission?:Permission; whereSql?:string; scopeEmployeeColumn?:string; fixedValues?:Record<string,string|number|boolean>; allowCreate?:boolean; allowUpdate?:boolean; allowDelete?:boolean; listFields?:string[] };

const workflow:SelectOption[] = [
  {value:"DRAFT",label:"Draft",labelAr:"مسودة"},{value:"PENDING",label:"Pending",labelAr:"معلّق"},{value:"APPROVED",label:"Approved",labelAr:"معتمد"},
  {value:"REJECTED",label:"Rejected",labelAr:"مرفوض"},{value:"CANCELLED",label:"Cancelled",labelAr:"ملغي"},{value:"COMPLETED",label:"Completed",labelAr:"مكتمل"}
];
const yesNo:SelectOption[] = [{value:"true",label:"Yes",labelAr:"نعم"},{value:"false",label:"No",labelAr:"لا"}];
const activeStatus:SelectOption[] = [{value:"ACTIVE",label:"Active",labelAr:"نشط"},{value:"INACTIVE",label:"Inactive",labelAr:"غير نشط"}];
const employeeStatus:SelectOption[] = [
  {value:"ACTIVE",label:"Active",labelAr:"نشط"},{value:"ON_LEAVE",label:"On leave",labelAr:"في إجازة"},{value:"SUSPENDED",label:"Suspended",labelAr:"موقوف"},{value:"TERMINATED",label:"Terminated",labelAr:"منتهي الخدمة"}
];
const roleOptions:SelectOption[] = ["SUPER_ADMIN","HR_ADMIN","HR_MANAGER","MANAGER","PAYROLL","RECRUITER","EMPLOYEE","AUDITOR"].map(value=>({value,label:value.replaceAll("_"," "),labelAr:value}));

const employeeLookup:LookupDef={table:"employees",labelSql:"employee_no || ' · ' || first_name || ' ' || last_name",whereSql:"deleted_at IS NULL",orderBy:"employee_no"};
const userLookup:LookupDef={table:"users",labelSql:"display_name || ' · ' || email",whereSql:"is_active = TRUE",orderBy:"display_name"};
const branchLookup:LookupDef={table:"branches",labelSql:"code || ' · ' || name",whereSql:"is_active = TRUE",orderBy:"code"};
const departmentLookup:LookupDef={table:"departments",labelSql:"code || ' · ' || name",whereSql:"is_active = TRUE",orderBy:"code"};
const positionLookup:LookupDef={table:"positions",labelSql:"code || ' · ' || title",orderBy:"code"};
const leaveTypeLookup:LookupDef={table:"leave_types",labelSql:"code || ' · ' || name",whereSql:"is_active = TRUE",orderBy:"code"};
const shiftLookup:LookupDef={table:"shifts",labelSql:"name",whereSql:"is_active = TRUE",orderBy:"name"};
const legalEntityLookup:LookupDef={table:"legal_entities",labelSql:"name || ' · ' || country_code",whereSql:"is_active = TRUE",orderBy:"name"};
const requisitionLookup:LookupDef={table:"recruitment_requisitions",labelSql:"title",orderBy:"created_at DESC"};
const candidateLookup:LookupDef={table:"candidates",labelSql:"full_name || COALESCE(' · ' || email,'')",orderBy:"full_name"};
const courseLookup:LookupDef={table:"training_courses",labelSql:"code || ' · ' || title",whereSql:"active = TRUE",orderBy:"code"};
const assetLookup:LookupDef={table:"assets",labelSql:"asset_no || ' · ' || COALESCE(description,category)",orderBy:"asset_no"};
const payrollRunLookup:LookupDef={table:"payroll_runs",labelSql:"period_year::text || '-' || lpad(period_month::text,2,'0') || ' · ' || currency",orderBy:"period_year DESC, period_month DESC"};
const offboardingLookup:LookupDef={table:"offboarding_cases",labelSql:"reason || ' · ' || last_working_day::text",orderBy:"created_at DESC"};

const f=(key:string,label:string,labelAr:string,type:FieldType="text",extra:Partial<WorkspaceField>={}):WorkspaceField=>({key,column:key,label,labelAr,type,...extra});
const lookup=(key:string,label:string,labelAr:string,def:LookupDef,required=false)=>f(key,label,labelAr,"lookup",{lookup:def,required});
const statusField=f("status","Status","الحالة","select",{options:workflow,required:true});

const tables = {
  legal_entities:{fields:[f("name","Name","الاسم","text",{required:true}),f("country_code","Country code","رمز الدولة","text",{required:true}),f("registration_no","Registration no.","رقم السجل"),f("currency","Currency","العملة","text",{required:true}),f("is_active","Active","نشط","boolean")],listFields:["name","country_code","registration_no","currency","is_active"],orderBy:"name"},
  branches:{fields:[lookup("legal_entity_id","Legal entity","الكيان القانوني",legalEntityLookup),f("name","Name","الاسم","text",{required:true}),f("code","Code","الرمز","text",{required:true}),f("country_code","Country code","رمز الدولة","text",{required:true}),f("city","City","المدينة"),f("location_type","Location type","نوع الموقع"),f("is_active","Active","نشط","boolean")],listFields:["code","name","city","country_code","location_type","is_active"],orderBy:"code"},
  departments:{fields:[lookup("parent_id","Parent department","الإدارة الأم",departmentLookup),f("name","Name","الاسم","text",{required:true}),f("code","Code","الرمز","text",{required:true}),f("cost_center","Cost center","مركز التكلفة"),f("is_active","Active","نشط","boolean")],listFields:["code","name","parent_id","cost_center","is_active"],orderBy:"code"},
  positions:{fields:[lookup("department_id","Department","الإدارة",departmentLookup),lookup("branch_id","Branch","الفرع",branchLookup),f("title","Title","المسمى","text",{required:true}),f("code","Code","الرمز","text",{required:true}),f("grade","Grade","الدرجة"),lookup("reports_to_position_id","Reports to","يتبع إلى",positionLookup),f("status","Status","الحالة","select",{options:activeStatus,required:true})],listFields:["code","title","department_id","branch_id","grade","status"],orderBy:"code"},
  employees:{fields:[f("employee_no","Employee no.","الرقم الوظيفي"),f("first_name","First name","الاسم الأول"),f("last_name","Last name","اسم العائلة"),f("work_email","Work email","البريد الوظيفي","email"),f("job_title","Job title","المسمى الوظيفي"),lookup("department_id","Department","الإدارة",departmentLookup),lookup("branch_id","Branch","الفرع",branchLookup),f("employment_type","Employment type","نوع التوظيف","select",{options:[{value:"FULL_TIME",label:"Full time",labelAr:"دوام كامل"},{value:"PART_TIME",label:"Part time",labelAr:"دوام جزئي"},{value:"CONTRACT",label:"Contract",labelAr:"عقد"},{value:"TEMPORARY",label:"Temporary",labelAr:"مؤقت"}]}),f("status","Status","الحالة","select",{options:employeeStatus})],listFields:["employee_no","first_name","last_name","job_title","department_id","branch_id","status"],orderBy:"employee_no",allowCreate:false,allowUpdate:false,allowDelete:false},
  attendance_records:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("work_date","Work date","تاريخ العمل","date",{required:true}),f("clock_in","Clock in","الحضور","datetime-local"),f("clock_out","Clock out","الانصراف","datetime-local"),f("status","Attendance status","حالة الحضور","select",{options:[{value:"PRESENT",label:"Present",labelAr:"حاضر"},{value:"ABSENT",label:"Absent",labelAr:"غائب"},{value:"LATE",label:"Late",labelAr:"متأخر"},{value:"REMOTE",label:"Remote",labelAr:"عن بُعد"}],required:true}),f("source","Source","المصدر","select",{options:[{value:"MANUAL",label:"Manual",labelAr:"يدوي"},{value:"DEVICE",label:"Device",labelAr:"جهاز"},{value:"MOBILE",label:"Mobile",labelAr:"هاتف"}]}),f("overtime_minutes","Overtime minutes","دقائق العمل الإضافي","number"),f("correction_status","Correction status","حالة التصحيح","select",{options:workflow})],listFields:["employee_id","work_date","clock_in","clock_out","status","overtime_minutes","correction_status"],orderBy:"work_date DESC"},
  shifts:{fields:[f("name","Shift name","اسم المناوبة","text",{required:true}),f("start_time","Start time","وقت البداية","time",{required:true}),f("end_time","End time","وقت النهاية","time",{required:true}),f("break_minutes","Break minutes","دقائق الاستراحة","number"),f("overnight","Overnight","تمتد لليوم التالي","boolean"),f("is_active","Active","نشط","boolean")],listFields:["name","start_time","end_time","break_minutes","overnight","is_active"],orderBy:"name"},
  shift_assignments:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),lookup("shift_id","Shift","المناوبة",shiftLookup,true),lookup("branch_id","Branch","الفرع",branchLookup),f("assignment_date","Assignment date","تاريخ التكليف","date",{required:true}),lookup("supervisor_employee_id","Supervisor","المشرف",employeeLookup)],listFields:["employee_id","shift_id","branch_id","assignment_date","supervisor_employee_id"],orderBy:"assignment_date DESC"},
  leave_requests:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),lookup("leave_type_id","Leave type","نوع الإجازة",leaveTypeLookup,true),f("start_date","Start date","تاريخ البداية","date",{required:true}),f("end_date","End date","تاريخ النهاية","date",{required:true}),f("reason","Reason","السبب","textarea"),statusField,lookup("current_approver_user_id","Current approver","المعتمد الحالي",userLookup)],listFields:["employee_id","leave_type_id","start_date","end_date","status","current_approver_user_id"],orderBy:"created_at DESC"},
  leave_balances:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),lookup("leave_type_id","Leave type","نوع الإجازة",leaveTypeLookup,true),f("balance_year","Year","السنة","number",{required:true}),f("opening_balance","Opening","الرصيد الافتتاحي","number"),f("accrued","Accrued","المستحق","number"),f("used","Used","المستخدم","number"),f("adjusted","Adjusted","التعديل","number")],listFields:["employee_id","leave_type_id","balance_year","opening_balance","accrued","used","adjusted"],orderBy:"balance_year DESC"},
  leave_types:{fields:[f("name","Name","الاسم","text",{required:true}),f("code","Code","الرمز","text",{required:true}),f("annual_entitlement","Annual entitlement","الاستحقاق السنوي","number"),f("requires_attachment","Requires attachment","يتطلب مرفقًا","boolean"),f("is_active","Active","نشط","boolean")],listFields:["code","name","annual_entitlement","requires_attachment","is_active"],orderBy:"code"},
  payroll_runs:{fields:[lookup("legal_entity_id","Legal entity","الكيان القانوني",legalEntityLookup),f("period_year","Year","السنة","number",{required:true}),f("period_month","Month","الشهر","number",{required:true}),f("currency","Currency","العملة","text",{required:true}),statusField,f("gross_total","Gross total","الإجمالي","number"),f("deductions_total","Deductions","الاستقطاعات","number"),f("net_total","Net total","الصافي","number")],listFields:["period_year","period_month","legal_entity_id","currency","status","gross_total","deductions_total","net_total"],orderBy:"period_year DESC, period_month DESC"},
  employee_compensation:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("basic_salary","Basic salary","الراتب الأساسي","number",{required:true}),f("housing_allowance","Housing allowance","بدل السكن","number"),f("transport_allowance","Transport allowance","بدل النقل","number"),f("other_allowance","Other allowance","بدلات أخرى","number"),f("currency","Currency","العملة","text",{required:true}),f("effective_from","Effective from","ساري من","date",{required:true}),f("effective_to","Effective to","ساري إلى","date"),f("is_active","Active","نشط","boolean")],listFields:["employee_id","basic_salary","housing_allowance","transport_allowance","other_allowance","currency","effective_from","is_active"],orderBy:"effective_from DESC"},
  payroll_components:{fields:[f("code","Code","الرمز","text",{required:true}),f("name","Name","الاسم","text",{required:true}),f("component_type","Type","النوع","select",{options:[{value:"EARNING",label:"Earning",labelAr:"استحقاق"},{value:"DEDUCTION",label:"Deduction",labelAr:"استقطاع"}],required:true}),f("calculation_type","Calculation","طريقة الاحتساب","select",{options:[{value:"FIXED",label:"Fixed",labelAr:"ثابت"},{value:"PERCENTAGE",label:"Percentage",labelAr:"نسبة"},{value:"VARIABLE",label:"Variable",labelAr:"متغير"}],required:true}),f("default_amount","Default amount","القيمة الافتراضية","number"),f("taxable","Taxable","خاضع للضريبة","boolean"),f("active","Active","نشط","boolean")],listFields:["code","name","component_type","calculation_type","default_amount","taxable","active"],orderBy:"code"},
  payslips:{fields:[lookup("payroll_run_id","Payroll run","دورة الرواتب",payrollRunLookup,true),lookup("employee_id","Employee","الموظف",employeeLookup,true),f("basic_salary","Basic salary","الراتب الأساسي","number"),f("allowances","Allowances","البدلات","number"),f("overtime","Overtime","العمل الإضافي","number"),f("incentives","Incentives","الحوافز","number"),f("deductions","Deductions","الاستقطاعات","number"),f("net_salary","Net salary","صافي الراتب","number"),f("currency","Currency","العملة","text",{required:true})],listFields:["payroll_run_id","employee_id","basic_salary","allowances","overtime","incentives","deductions","net_salary","currency"],orderBy:"id DESC"},
  recruitment_requisitions:{fields:[lookup("position_id","Position","الوظيفة",positionLookup),lookup("branch_id","Branch","الفرع",branchLookup),f("title","Title","المسمى","text",{required:true}),f("openings","Openings","عدد الشواغر","number",{required:true}),statusField,lookup("requested_by","Requested by","مقدم الطلب",userLookup)],listFields:["title","position_id","branch_id","openings","status","requested_by"],orderBy:"created_at DESC"},
  candidates:{fields:[lookup("requisition_id","Requisition","طلب التوظيف",requisitionLookup),f("full_name","Full name","الاسم الكامل","text",{required:true}),f("email","Email","البريد","email"),f("phone","Phone","الهاتف"),f("stage","Stage","المرحلة","select",{options:[{value:"APPLIED",label:"Applied",labelAr:"متقدم"},{value:"SCREENING",label:"Screening",labelAr:"فرز"},{value:"INTERVIEW",label:"Interview",labelAr:"مقابلة"},{value:"OFFER",label:"Offer",labelAr:"عرض"},{value:"HIRED",label:"Hired",labelAr:"تم التعيين"},{value:"REJECTED",label:"Rejected",labelAr:"مرفوض"}]}),f("source","Source","المصدر")],listFields:["full_name","email","phone","requisition_id","stage","source"],orderBy:"created_at DESC"},
  recruitment_interviews:{fields:[lookup("candidate_id","Candidate","المرشح",candidateLookup,true),f("scheduled_at","Scheduled at","موعد المقابلة","datetime-local",{required:true}),lookup("interviewer_user_id","Interviewer","المقابل",userLookup),f("interview_type","Interview type","نوع المقابلة"),statusField,f("score","Score","الدرجة","number"),f("notes","Notes","الملاحظات","textarea")],listFields:["candidate_id","scheduled_at","interviewer_user_id","interview_type","status","score"],orderBy:"scheduled_at DESC"},
  recruitment_offers:{fields:[lookup("candidate_id","Candidate","المرشح",candidateLookup,true),lookup("position_id","Position","الوظيفة",positionLookup),f("offered_salary","Offered salary","الراتب المعروض","number"),f("currency","Currency","العملة","text"),statusField,f("issued_on","Issued on","تاريخ الإصدار","date"),f("expires_on","Expires on","تاريخ الانتهاء","date"),f("notes","Notes","الملاحظات","textarea")],listFields:["candidate_id","position_id","offered_salary","currency","status","issued_on","expires_on"],orderBy:"created_at DESC"},
  onboarding_tasks:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("title","Task","المهمة","text",{required:true}),f("owner_type","Owner type","جهة المسؤولية","text",{required:true}),f("due_date","Due date","تاريخ الاستحقاق","date"),statusField,f("completed_at","Completed at","تاريخ الإكمال","datetime-local")],listFields:["employee_id","title","owner_type","due_date","status","completed_at"],orderBy:"due_date"},
  probation_reviews:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("review_date","Review date","تاريخ التقييم","date",{required:true}),lookup("reviewer_employee_id","Reviewer","المقيّم",employeeLookup),f("outcome","Outcome","النتيجة","select",{options:[{value:"PENDING",label:"Pending",labelAr:"معلق"},{value:"CONFIRMED",label:"Confirmed",labelAr:"تثبيت"},{value:"EXTENDED",label:"Extended",labelAr:"تمديد"},{value:"FAILED",label:"Failed",labelAr:"لم يجتز"}]}),f("score","Score","الدرجة","number"),f("notes","Notes","الملاحظات","textarea")],listFields:["employee_id","review_date","reviewer_employee_id","outcome","score"],orderBy:"review_date DESC"},
  employee_documents:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("type","Document type","نوع المستند","text",{required:true}),f("document_no","Document no.","رقم المستند"),f("issued_on","Issued on","تاريخ الإصدار","date"),f("expires_on","Expires on","تاريخ الانتهاء","date"),f("storage_key","Storage key","مفتاح التخزين","text",{required:true}),f("classification","Classification","التصنيف","select",{options:[{value:"INTERNAL",label:"Internal",labelAr:"داخلي"},{value:"CONFIDENTIAL",label:"Confidential",labelAr:"سري"},{value:"RESTRICTED",label:"Restricted",labelAr:"مقيد"}]})],listFields:["employee_id","type","document_no","issued_on","expires_on","classification"],orderBy:"expires_on NULLS LAST"},
  document_templates:{fields:[f("code","Code","الرمز","text",{required:true}),f("name","Name","الاسم","text",{required:true}),f("category","Category","الفئة","text",{required:true}),f("body_template","Template","القالب","textarea",{required:true}),f("is_active","Active","نشط","boolean")],listFields:["code","name","category","is_active"],orderBy:"code"},
  performance_goals:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("title","Goal","الهدف","text",{required:true}),f("description","Description","الوصف","textarea"),f("weight","Weight %","الوزن %","number"),f("target_value","Target","المستهدف"),f("actual_value","Actual","المتحقق"),f("due_date","Due date","تاريخ الاستحقاق","date"),statusField],listFields:["employee_id","title","weight","target_value","actual_value","due_date","status"],orderBy:"due_date NULLS LAST"},
  performance_reviews:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),lookup("reviewer_employee_id","Reviewer","المقيّم",employeeLookup),f("cycle","Cycle","الدورة","text",{required:true}),statusField,f("score","Score","الدرجة","number"),f("summary","Summary","الملخص","textarea")],listFields:["employee_id","reviewer_employee_id","cycle","status","score"],orderBy:"created_at DESC"},
  performance_improvement_plans:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),lookup("manager_employee_id","Manager","المدير",employeeLookup),f("title","Plan title","عنوان الخطة","text",{required:true}),f("objectives","Objectives","الأهداف","textarea",{required:true}),f("start_date","Start date","تاريخ البداية","date",{required:true}),f("end_date","End date","تاريخ النهاية","date",{required:true}),statusField],listFields:["employee_id","title","manager_employee_id","start_date","end_date","status"],orderBy:"start_date DESC"},
  training_courses:{fields:[f("code","Code","الرمز","text",{required:true}),f("title","Course title","اسم الدورة","text",{required:true}),f("mandatory","Mandatory","إلزامي","boolean"),f("validity_months","Validity months","مدة الصلاحية بالأشهر","number"),f("active","Active","نشط","boolean")],listFields:["code","title","mandatory","validity_months","active"],orderBy:"code"},
  training_events:{fields:[lookup("course_id","Course","الدورة",courseLookup,true),lookup("branch_id","Branch","الفرع",branchLookup),f("start_at","Start","البداية","datetime-local",{required:true}),f("end_at","End","النهاية","datetime-local",{required:true}),f("capacity","Capacity","السعة","number"),f("trainer","Trainer","المدرب"),statusField],listFields:["course_id","branch_id","start_at","end_at","capacity","trainer","status"],orderBy:"start_at DESC"},
  training_enrollments:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),lookup("course_id","Course","الدورة",courseLookup,true),statusField,f("completed_on","Completed on","تاريخ الإكمال","date"),f("expires_on","Expires on","تاريخ الانتهاء","date"),f("certificate_storage_key","Certificate key","مفتاح الشهادة")],listFields:["employee_id","course_id","status","completed_on","expires_on"],orderBy:"expires_on NULLS LAST"},
  employee_skills:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("skill_name","Skill","المهارة","text",{required:true}),f("level","Level","المستوى","select",{options:[{value:"BASIC",label:"Basic",labelAr:"أساسي"},{value:"INTERMEDIATE",label:"Intermediate",labelAr:"متوسط"},{value:"ADVANCED",label:"Advanced",labelAr:"متقدم"},{value:"EXPERT",label:"Expert",labelAr:"خبير"}]}),lookup("verified_by_employee_id","Verified by","تم التحقق بواسطة",employeeLookup),f("verified_at","Verified at","تاريخ التحقق","datetime-local")],listFields:["employee_id","skill_name","level","verified_by_employee_id","verified_at"],orderBy:"skill_name"},
  workforce_assignments:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),lookup("branch_id","Branch","الفرع",branchLookup),lookup("supervisor_employee_id","Supervisor","المشرف",employeeLookup),f("assignment_type","Assignment type","نوع التكليف","text",{required:true}),f("assignment_date","Date","التاريخ","date",{required:true}),f("start_time","Start time","البداية","time"),f("end_time","End time","النهاية","time"),statusField,f("notes","Notes","الملاحظات","textarea")],listFields:["employee_id","branch_id","assignment_type","assignment_date","start_time","end_time","status"],orderBy:"assignment_date DESC"},
  driver_profiles:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("license_no","License no.","رقم الرخصة","text",{required:true}),f("license_type","License type","نوع الرخصة"),f("license_expiry","License expiry","انتهاء الرخصة","date"),f("vehicle_class","Vehicle class","فئة المركبة"),f("eligible","Eligible","مؤهل","boolean"),f("status","Status","الحالة","select",{options:activeStatus})],listFields:["employee_id","license_no","license_type","license_expiry","vehicle_class","eligible","status"],orderBy:"license_expiry NULLS LAST"},
  assets:{fields:[f("asset_no","Asset no.","رقم الأصل","text",{required:true}),f("category","Category","الفئة","text",{required:true}),f("description","Description","الوصف"),f("status","Status","الحالة","select",{options:[{value:"AVAILABLE",label:"Available",labelAr:"متاح"},{value:"ASSIGNED",label:"Assigned",labelAr:"مسلم"},{value:"MAINTENANCE",label:"Maintenance",labelAr:"صيانة"},{value:"LOST",label:"Lost",labelAr:"مفقود"}]})],listFields:["asset_no","category","description","status"],orderBy:"asset_no"},
  asset_assignments:{fields:[lookup("asset_id","Asset","الأصل",assetLookup,true),lookup("employee_id","Employee","الموظف",employeeLookup,true),f("assigned_at","Assigned at","تاريخ التسليم","datetime-local"),f("returned_at","Returned at","تاريخ الإرجاع","datetime-local"),f("condition_on_return","Condition on return","حالة الأصل عند الإرجاع")],listFields:["asset_id","employee_id","assigned_at","returned_at","condition_on_return"],orderBy:"assigned_at DESC"},
  hr_requests:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("type","Request type","نوع الطلب","text",{required:true}),f("subject","Subject","الموضوع","text",{required:true}),f("details","Details","التفاصيل","textarea"),statusField,lookup("assigned_to_user_id","Assigned to","مسند إلى",userLookup)],listFields:["employee_id","type","subject","status","assigned_to_user_id"],orderBy:"created_at DESC"},
  hr_service_catalog:{fields:[f("code","Code","الرمز","text",{required:true}),f("name","Service name","اسم الخدمة","text",{required:true}),f("description","Description","الوصف","textarea"),f("sla_hours","SLA hours","ساعات SLA","number"),f("active","Active","نشط","boolean")],listFields:["code","name","sla_hours","active"],orderBy:"code"},
  approval_actions:{fields:[f("entity_type","Entity type","نوع المعاملة"),f("entity_id","Entity ID","معرف المعاملة"),f("step_no","Step","الخطوة","number"),lookup("approver_user_id","Approver","المعتمد",userLookup),f("decision","Decision","القرار","select",{options:[{value:"APPROVED",label:"Approved",labelAr:"معتمد"},{value:"REJECTED",label:"Rejected",labelAr:"مرفوض"},{value:"RETURNED",label:"Returned",labelAr:"معاد"}]}),f("comments","Comments","التعليقات","textarea"),f("decided_at","Decided at","تاريخ القرار","datetime-local")],listFields:["entity_type","entity_id","step_no","approver_user_id","decision","decided_at"],orderBy:"created_at DESC"},
  approval_workflows:{fields:[f("entity_type","Entity type","نوع المعاملة","text",{required:true}),f("name","Workflow name","اسم سير العمل","text",{required:true}),f("steps_json","Steps JSON","خطوات سير العمل","json",{required:true}),f("is_active","Active","نشط","boolean")],listFields:["entity_type","name","is_active"],orderBy:"entity_type, name"},
  employee_relations_cases:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup),f("case_type","Case type","نوع الحالة","text",{required:true}),f("title","Title","العنوان","text",{required:true}),f("details","Details","التفاصيل","textarea"),statusField,f("classification","Classification","التصنيف","select",{options:[{value:"CONFIDENTIAL",label:"Confidential",labelAr:"سري"},{value:"RESTRICTED",label:"Restricted",labelAr:"مقيد"}]}),lookup("owner_user_id","Owner","المسؤول",userLookup)],listFields:["employee_id","case_type","title","status","classification","owner_user_id"],orderBy:"created_at DESC"},
  offboarding_cases:{fields:[lookup("employee_id","Employee","الموظف",employeeLookup,true),f("reason","Reason","السبب","text",{required:true}),f("last_working_day","Last working day","آخر يوم عمل","date",{required:true}),statusField,f("final_settlement_status","Settlement status","حالة التسوية","select",{options:workflow}),f("access_closed_at","Access closed at","إغلاق الصلاحيات","datetime-local")],listFields:["employee_id","reason","last_working_day","status","final_settlement_status","access_closed_at"],orderBy:"last_working_day DESC"},
  offboarding_clearance:{fields:[lookup("offboarding_case_id","Offboarding case","حالة إنهاء الخدمة",offboardingLookup,true),f("area","Area","الجهة","text",{required:true}),lookup("owner_user_id","Owner","المسؤول",userLookup),statusField,f("completed_at","Completed at","تاريخ الإكمال","datetime-local"),f("notes","Notes","الملاحظات","textarea")],listFields:["offboarding_case_id","area","owner_user_id","status","completed_at"],orderBy:"id DESC"},
  exit_interviews:{fields:[lookup("offboarding_case_id","Offboarding case","حالة إنهاء الخدمة",offboardingLookup,true),f("interviewed_at","Interviewed at","تاريخ المقابلة","datetime-local"),lookup("interviewer_user_id","Interviewer","المقابل",userLookup),f("reason_category","Reason category","تصنيف السبب"),f("feedback","Feedback","الملاحظات","textarea"),f("would_rehire","Would rehire","إمكانية إعادة التوظيف","boolean")],listFields:["offboarding_case_id","interviewed_at","interviewer_user_id","reason_category","would_rehire"],orderBy:"created_at DESC"},
  users:{fields:[f("email","Email","البريد","email",{readOnly:true}),f("display_name","Display name","الاسم"),f("role","Role","الدور","select",{options:roleOptions}),lookup("branch_id","Branch","الفرع",branchLookup),f("is_active","Active","نشط","boolean"),f("last_login_at","Last login","آخر دخول","datetime-local",{readOnly:true})],listFields:["email","display_name","role","branch_id","is_active","last_login_at"],orderBy:"display_name",allowCreate:false,allowDelete:false},
  system_settings:{fields:[f("setting_key","Key","المفتاح","text",{required:true}),f("category","Category","الفئة","text",{required:true}),f("setting_value_json","Value JSON","القيمة JSON","json",{required:true})],listFields:["setting_key","category","setting_value_json"],orderBy:"category, setting_key",updatedByColumn:"updated_by"},
  integrations:{fields:[f("name","Name","الاسم","text",{required:true}),f("integration_type","Type","النوع","text",{required:true}),f("status","Status","الحالة","select",{options:[{value:"DISABLED",label:"Disabled",labelAr:"معطل"},{value:"ENABLED",label:"Enabled",labelAr:"مفعل"},{value:"ERROR",label:"Error",labelAr:"خطأ"}]}),f("config_json","Configuration JSON","إعدادات JSON","json"),f("last_sync_at","Last sync","آخر مزامنة","datetime-local")],listFields:["name","integration_type","status","last_sync_at"],orderBy:"name"},
  audit_logs:{fields:[f("actor_user_id","Actor","المنفذ","lookup",{lookup:userLookup,readOnly:true}),f("action","Action","الإجراء", "text",{readOnly:true}),f("entity_type","Entity type","نوع الكيان","text",{readOnly:true}),f("entity_id","Entity ID","معرف الكيان","text",{readOnly:true}),f("request_id","Request ID","معرف الطلب","text",{readOnly:true}),f("created_at","Created at","التاريخ","datetime-local",{readOnly:true})],listFields:["created_at","actor_user_id","action","entity_type","entity_id","request_id"],orderBy:"created_at DESC",allowCreate:false,allowUpdate:false,allowDelete:false}
} satisfies Record<string,TableDef>;

const screens:Record<string,ScreenDef> = {
  "organization/companies":{table:"legal_entities",readPermission:"organization:read",writePermission:"organization:write"},
  "organization/branches":{table:"branches",readPermission:"organization:read",writePermission:"organization:write"},
  "organization/departments":{table:"departments",readPermission:"organization:read",writePermission:"organization:write"},
  "organization/org-chart":{table:"positions",readPermission:"organization:read",writePermission:"organization:write",allowCreate:false,allowUpdate:false,allowDelete:false},
  "organization/positions":{table:"positions",readPermission:"organization:read",writePermission:"organization:write"},

  "attendance/today":{table:"attendance_records",readPermission:"attendance:read",writePermission:"attendance:write",whereSql:"work_date = CURRENT_DATE",scopeEmployeeColumn:"employee_id"},
  "attendance/timesheets":{table:"attendance_records",readPermission:"attendance:read",writePermission:"attendance:write",scopeEmployeeColumn:"employee_id"},
  "attendance/exceptions":{table:"attendance_records",readPermission:"attendance:read",writePermission:"attendance:write",whereSql:"(status <> 'PRESENT' OR correction_status NOT IN ('DRAFT','COMPLETED'))",scopeEmployeeColumn:"employee_id"},
  "attendance/overtime":{table:"attendance_records",readPermission:"attendance:read",writePermission:"attendance:write",whereSql:"overtime_minutes > 0",scopeEmployeeColumn:"employee_id"},

  "shifts/planner":{table:"shift_assignments",readPermission:"shifts:read",writePermission:"shifts:write",scopeEmployeeColumn:"employee_id"},
  "shifts/templates":{table:"shifts",readPermission:"shifts:read",writePermission:"shifts:write"},
  "shifts/assignments":{table:"shift_assignments",readPermission:"shifts:read",writePermission:"shifts:write",scopeEmployeeColumn:"employee_id"},

  "leave/requests":{table:"leave_requests",readPermission:"leave:read",writePermission:"leave:write",scopeEmployeeColumn:"employee_id",createdByColumn:"created_by"},
  "leave/balances":{table:"leave_balances",readPermission:"leave:read",writePermission:"leave:write",scopeEmployeeColumn:"employee_id"},
  "leave/calendar":{table:"leave_requests",readPermission:"leave:read",writePermission:"leave:write",scopeEmployeeColumn:"employee_id",allowCreate:false,allowUpdate:false,allowDelete:false},
  "leave/policies":{table:"leave_types",readPermission:"leave:read",writePermission:"leave:write"},

  "payroll/runs":{table:"payroll_runs",readPermission:"payroll:read",writePermission:"payroll:write"},
  "payroll/salaries":{table:"employee_compensation",readPermission:"payroll:read",writePermission:"payroll:write",scopeEmployeeColumn:"employee_id"},
  "payroll/components":{table:"payroll_components",readPermission:"payroll:read",writePermission:"payroll:write"},
  "payroll/overtime":{table:"payslips",readPermission:"payroll:read",writePermission:"payroll:write",whereSql:"overtime > 0",scopeEmployeeColumn:"employee_id"},
  "payroll/payslips":{table:"payslips",readPermission:"payroll:read",writePermission:"payroll:write",scopeEmployeeColumn:"employee_id"},

  "recruitment/requisitions":{table:"recruitment_requisitions",readPermission:"recruitment:read",writePermission:"recruitment:write",createdByColumn:"requested_by"},
  "recruitment/vacancies":{table:"recruitment_requisitions",readPermission:"recruitment:read",writePermission:"recruitment:write",whereSql:"status IN ('PENDING','APPROVED')"},
  "recruitment/candidates":{table:"candidates",readPermission:"recruitment:read",writePermission:"recruitment:write"},
  "recruitment/interviews":{table:"recruitment_interviews",readPermission:"recruitment:read",writePermission:"recruitment:write"},
  "recruitment/offers":{table:"recruitment_offers",readPermission:"recruitment:read",writePermission:"recruitment:write"},

  "onboarding/new-hires":{table:"onboarding_tasks",readPermission:"employee:read",writePermission:"employee:write",whereSql:"status <> 'COMPLETED'",scopeEmployeeColumn:"employee_id"},
  "onboarding/checklists":{table:"onboarding_tasks",readPermission:"employee:read",writePermission:"employee:write",scopeEmployeeColumn:"employee_id"},
  "onboarding/probation":{table:"probation_reviews",readPermission:"performance:read",writePermission:"performance:write",scopeEmployeeColumn:"employee_id"},

  "documents/employee-documents":{table:"employee_documents",readPermission:"documents:read",writePermission:"documents:write",scopeEmployeeColumn:"employee_id"},
  "documents/expiry":{table:"employee_documents",readPermission:"documents:read",writePermission:"documents:write",whereSql:"expires_on IS NOT NULL AND expires_on <= CURRENT_DATE + INTERVAL '90 days'",scopeEmployeeColumn:"employee_id",allowCreate:false},
  "documents/templates":{table:"document_templates",readPermission:"documents:read",writePermission:"documents:write"},

  "performance/goals":{table:"performance_goals",readPermission:"performance:read",writePermission:"performance:write",scopeEmployeeColumn:"employee_id"},
  "performance/reviews":{table:"performance_reviews",readPermission:"performance:read",writePermission:"performance:write",scopeEmployeeColumn:"employee_id"},
  "performance/calibration":{table:"performance_reviews",readPermission:"performance:read",writePermission:"performance:write",allowCreate:false,allowDelete:false},
  "performance/improvement":{table:"performance_improvement_plans",readPermission:"performance:read",writePermission:"performance:write",scopeEmployeeColumn:"employee_id"},

  "training/catalog":{table:"training_courses",readPermission:"training:read",writePermission:"training:write"},
  "training/calendar":{table:"training_events",readPermission:"training:read",writePermission:"training:write"},
  "training/compliance":{table:"training_enrollments",readPermission:"training:read",writePermission:"training:write",scopeEmployeeColumn:"employee_id"},
  "training/skills":{table:"employee_skills",readPermission:"training:read",writePermission:"training:write",scopeEmployeeColumn:"employee_id"},

  "workforce/availability":{table:"employees",readPermission:"workforce:read",allowCreate:false,allowUpdate:false,allowDelete:false},
  "workforce/assignments":{table:"workforce_assignments",readPermission:"workforce:read",writePermission:"workforce:write",scopeEmployeeColumn:"employee_id"},
  "workforce/drivers":{table:"driver_profiles",readPermission:"workforce:read",writePermission:"workforce:write",scopeEmployeeColumn:"employee_id"},

  "assets/inventory":{table:"assets",readPermission:"assets:read",writePermission:"assets:write"},
  "assets/assigned":{table:"asset_assignments",readPermission:"assets:read",writePermission:"assets:write",whereSql:"returned_at IS NULL",scopeEmployeeColumn:"employee_id"},
  "assets/returns":{table:"asset_assignments",readPermission:"assets:read",writePermission:"assets:write",whereSql:"returned_at IS NOT NULL",scopeEmployeeColumn:"employee_id",allowCreate:false},

  "requests/my-requests":{table:"hr_requests",readPermission:"requests:read",writePermission:"requests:write",scopeEmployeeColumn:"employee_id"},
  "requests/service-catalog":{table:"hr_service_catalog",readPermission:"requests:read",writePermission:"requests:write"},
  "requests/hr-cases":{table:"hr_requests",readPermission:"requests:read",writePermission:"requests:write"},

  "approvals/pending":{table:"approval_actions",readPermission:"approvals:read",writePermission:"approvals:write",whereSql:"decision IS NULL",allowCreate:false,allowDelete:false},
  "approvals/history":{table:"approval_actions",readPermission:"approvals:read",whereSql:"decision IS NOT NULL",allowCreate:false,allowUpdate:false,allowDelete:false},
  "approvals/workflows":{table:"approval_workflows",readPermission:"approvals:read",writePermission:"approvals:write"},

  "relations/cases":{table:"employee_relations_cases",readPermission:"relations:read",writePermission:"relations:write"},
  "relations/grievances":{table:"employee_relations_cases",readPermission:"relations:read",writePermission:"relations:write",whereSql:"case_type = 'GRIEVANCE'",fixedValues:{case_type:"GRIEVANCE"}},
  "relations/disciplinary":{table:"employee_relations_cases",readPermission:"relations:read",writePermission:"relations:write",whereSql:"case_type = 'DISCIPLINARY'",fixedValues:{case_type:"DISCIPLINARY"}},
  "relations/incidents":{table:"employee_relations_cases",readPermission:"relations:read",writePermission:"relations:write",whereSql:"case_type = 'INCIDENT'",fixedValues:{case_type:"INCIDENT"}},

  "offboarding/cases":{table:"offboarding_cases",readPermission:"offboarding:read",writePermission:"offboarding:write",scopeEmployeeColumn:"employee_id"},
  "offboarding/clearance":{table:"offboarding_clearance",readPermission:"offboarding:read",writePermission:"offboarding:write"},
  "offboarding/exit-interviews":{table:"exit_interviews",readPermission:"offboarding:read",writePermission:"offboarding:write"},
  "offboarding/final-settlement":{table:"offboarding_cases",readPermission:"offboarding:read",writePermission:"offboarding:write",scopeEmployeeColumn:"employee_id",allowCreate:false,allowDelete:false,listFields:["employee_id","last_working_day","final_settlement_status","status"]},

  "reports/workforce":{table:"employees",readPermission:"reports:view",allowCreate:false,allowUpdate:false,allowDelete:false},
  "reports/attendance":{table:"attendance_records",readPermission:"reports:view",allowCreate:false,allowUpdate:false,allowDelete:false},
  "reports/payroll":{table:"payroll_runs",readPermission:"reports:view",allowCreate:false,allowUpdate:false,allowDelete:false},
  "reports/recruitment":{table:"recruitment_requisitions",readPermission:"reports:view",allowCreate:false,allowUpdate:false,allowDelete:false},
  "reports/documents":{table:"employee_documents",readPermission:"reports:view",whereSql:"expires_on IS NOT NULL",allowCreate:false,allowUpdate:false,allowDelete:false},

  "admin/users":{table:"users",readPermission:"admin:manage",writePermission:"admin:manage",allowCreate:false,allowDelete:false},
  "admin/roles":{table:"users",readPermission:"admin:manage",allowCreate:false,allowUpdate:false,allowDelete:false,listFields:["display_name","email","role","is_active"]},
  "admin/settings":{table:"system_settings",readPermission:"admin:manage",writePermission:"admin:manage"},
  "admin/workflows":{table:"approval_workflows",readPermission:"admin:manage",writePermission:"admin:manage"},
  "admin/integrations":{table:"integrations",readPermission:"admin:manage",writePermission:"admin:manage"},
  "admin/audit":{table:"audit_logs",readPermission:"audit:read",allowCreate:false,allowUpdate:false,allowDelete:false}
};

export function getWorkspaceConfig(moduleKey:string, screenSlug:string):WorkspaceConfig|undefined {
  const screen=screens[`${moduleKey}/${screenSlug}`];
  if(!screen) return undefined;
  const table=tables[screen.table];
  return {
    ...table,
    ...screen,
    table:screen.table,
    fields:table.fields,
    listFields:screen.listFields ?? table.listFields ?? table.fields.filter(x=>!x.hidden).slice(0,7).map(x=>x.key),
    whereSql:screen.whereSql ?? table.whereSql,
    orderBy:table.orderBy ?? "id DESC",
    allowCreate:screen.allowCreate ?? table.allowCreate ?? Boolean(screen.writePermission),
    allowUpdate:screen.allowUpdate ?? table.allowUpdate ?? Boolean(screen.writePermission),
    allowDelete:screen.allowDelete ?? table.allowDelete ?? Boolean(screen.writePermission)
  };
}

export function localizedField(field:WorkspaceField, locale:"ar"|"en") {
  return {...field,label:locale==="ar"?field.labelAr:field.label,options:field.options?.map(o=>({...o,label:locale==="ar"?(o.labelAr??o.label):o.label}))};
}
