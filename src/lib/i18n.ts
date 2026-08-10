import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";
export type { Locale } from "@/lib/locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "ar";
}


const ar = {
  common: {
    arabic: "العربية", english: "English", language: "اللغة", new: "+ جديد",
    createRecord: "+ إنشاء سجل", search: "بحث", filter: "تصفية", export: "تصدير",
    showing: "عرض 1–5 من 24", updated: "آخر تحديث", status: "الحالة", location: "الموقع",
    department: "الإدارة", reference: "المرجع", noDepartment: "بدون إدارة", noBranch: "بدون فرع",
    notProvided: "غير متوفر", back: "رجوع", save: "حفظ", cancel: "إلغاء"
  },
  login: {
    platform: "منصة الموارد البشرية المؤسسية", headline: "مكان آمن واحد لإدارة القوى العاملة.",
    description: "الموارد البشرية الأساسية، الحضور، المناوبات، الرواتب، التوظيف، المستندات، الأداء، القوى العاملة الميدانية والتحليلات — بهيكل مناسب للعمليات اللوجستية متعددة المواقع.",
    authorized: "دخول مصرح", signIn: "تسجيل الدخول", prompt: "استخدم حساب منصة الموارد البشرية الخاص بالشركة.",
    email: "البريد الإلكتروني", password: "كلمة المرور", verifying: "جارٍ التحقق…", secureSignIn: "دخول آمن",
    help: "محمي بتحديد محاولات الدخول، وملفات جلسة آمنة، وسجل تدقيق.", unable: "تعذر تسجيل الدخول",
    badges: ["صلاحيات RBAC", "سجل التدقيق", "حماية CSRF", "جلسات آمنة", "عزل البيانات"]
  },
  topbar: { company: "الطرود الدولية", title: "نظام تخطيط موارد الموارد البشرية", search: "بحث", notifications: "الإشعارات", signOut: "تسجيل الخروج", signingOut: "جارٍ تسجيل الخروج…" },
  sidebar: {
    brand: "نظام الموارد البشرية", footer: "جلسة آمنة · صلاحيات RBAC",
    groups: { core: "الموارد البشرية", workforce: "القوى العاملة", peopleOps: "عمليات الأفراد", services: "الخدمات", insights: "التحليلات" },
    items: {
      dashboard:"لوحة التحكم", employees:"الموظفون", organization:"الهيكل التنظيمي", attendance:"الحضور والانصراف",
      shifts:"تخطيط المناوبات", leave:"الإجازات", workforce:"القوى العاملة الميدانية", recruitment:"التوظيف",
      onboarding:"تهيئة الموظفين", performance:"الأداء", training:"التعلم والتطوير", documents:"المستندات",
      assets:"أصول الموظفين", requests:"خدمات الموارد البشرية", approvals:"الاعتمادات", relations:"علاقات الموظفين",
      offboarding:"إنهاء الخدمة", payroll:"الرواتب", reports:"التقارير والتحليلات", admin:"إدارة النظام"
    }
  },
  dashboard: {
    eyebrow:"نظرة عامة على القوى العاملة", greeting:"مرحبًا", snapshot:"ملخص تشغيلي للقوى العاملة عبر مواقع الطرود.",
    employees:"الموظفون", presentToday:"الحضور اليوم", openActions:"إجراءات مفتوحة",
    activeWorkforce:"القوى العاملة النشطة", activeHint:"+12 هذا الربع", onLeave:"في إجازة اليوم", leaveHint:"4.0% من القوى العاملة",
    overtime:"العمل الإضافي هذا الشهر", overtimeHint:"-6.2% عن الشهر السابق", expiring:"مستندات تنتهي خلال ≤30 يومًا", expiringHint:"تتطلب إجراء من الموارد البشرية",
    trend:"اتجاه القوى العاملة", trendHint:"حركة أعداد الموظفين · آخر 12 شهرًا", allLocations:"جميع المواقع",
    actionCenter:"مركز الإجراءات", priority:"العناصر ذات الأولوية", leaveApprovals:"اعتمادات الإجازات", overtimeApprovals:"اعتمادات العمل الإضافي",
    contracts:"عقود قاربت الانتهاء", probation:"تقييمات فترة التجربة", missingDocuments:"مستندات ناقصة"
  },
  modulePage: {
    module:"وحدة", openItems:"عناصر مفتوحة", needsAttention:"تحتاج إلى متابعة", completed:"مكتمل", thisMonth:"هذا الشهر",
    compliance:"الامتثال", policyTarget:"المستهدف 95%", exceptions:"استثناءات", reviewQueue:"قائمة المراجعة",
    workspace:"مساحات العمل", select:"اختر مساحة عمل للمتابعة.", search:"بحث"
  },
  screenPage: {
    workspace:"مساحة عمل", searchRecords:"بحث في السجلات", headers:["المرجع","الإدارة","الموقع","الحالة","آخر تحديث"],
    departments:["العمليات","المستودع","المالية","العمليات","الموارد البشرية"], locations:["مسقط","صحار","مسقط","دبي","مسقط"],
    statuses:["نشط","قيد الانتظار","نشط","للمراجعة","نشط"]
  },
  employees: {
    eyebrow:"الموارد البشرية الأساسية", title:"الموظفون", subtitle:"دليل موظفين آمن ومقيّد حسب المؤسسة وصلاحيات المستخدم.", add:"+ إضافة موظف",
    total:"إجمالي الموظفين", currentResult:"مجموعة النتائج الحالية", active:"نشط", employmentStatus:"الحالة الوظيفية", onLeave:"في إجازة",
    currentStatus:"الحالة الحالية", dataScope:"نطاق البيانات", isolated:"معزول حسب المؤسسة", search:"بحث عن موظف",
    dbError:"قاعدة البيانات غير متصلة حاليًا. شغّل PostgreSQL ثم نفّذ أوامر migration وseed حسب README.",
    empty:"لا يوجد موظفون بعد. أنشئ أول موظف.", headers:["الموظف","الرقم","المسمى الوظيفي","الإدارة","الفرع","الحالة"],
    breadcrumb:"الموظفون", newEmployee:"موظف جديد", createTitle:"إنشاء موظف", createSubtitle:"أضف سجل موظف جديد. يتم التحقق من الحقول الحساسة على الخادم وتسجيل جميع التغييرات في سجل التدقيق."
  },
  employeeForm: {
    employeeNo:"الرقم الوظيفي", workEmail:"البريد الوظيفي", firstName:"الاسم الأول", lastName:"اسم العائلة", phone:"الهاتف", jobTitle:"المسمى الوظيفي",
    employmentType:"نوع التوظيف", hireDate:"تاريخ التعيين", status:"الحالة", cancel:"إلغاء", saving:"جارٍ الحفظ…", create:"إنشاء الموظف", unable:"تعذر حفظ الموظف"
  },
  employeeProfile: {
    overview:"نظرة عامة", employment:"الوظيفة", attendance:"الحضور", leave:"الإجازات", documents:"المستندات", performance:"الأداء", training:"التدريب", assets:"الأصول", timeline:"السجل الزمني",
    title:"نظرة عامة على التوظيف", subtitle:"السجل الأساسي للموظف", employmentType:"نوع التوظيف", hireDate:"تاريخ التعيين", phone:"الهاتف", dataBoundary:"حدود البيانات", boundaryText:"يتم فرض نطاق المؤسسة من جهة الخادم."
  },
  forbidden: { title:"الدخول مقيّد", description:"صلاحية حسابك لا تسمح بفتح مساحة العمل هذه.", back:"العودة إلى لوحة التحكم" },
  status: { ACTIVE:"نشط", ON_LEAVE:"في إجازة", SUSPENDED:"موقوف", TERMINATED:"منتهي الخدمة", PENDING:"قيد الانتظار", REVIEW:"للمراجعة" },
  employmentType: { FULL_TIME:"دوام كامل", PART_TIME:"دوام جزئي", CONTRACT:"عقد", TEMPORARY:"مؤقت" }
} as const;

const en = {
  common: {
    arabic:"العربية", english:"English", language:"Language", new:"+ New", createRecord:"+ Create record", search:"Search", filter:"Filter", export:"Export",
    showing:"Showing 1–5 of 24", updated:"Updated", status:"Status", location:"Location", department:"Department", reference:"Reference", noDepartment:"No department", noBranch:"No branch", notProvided:"Not provided", back:"Back", save:"Save", cancel:"Cancel"
  },
  login: {
    platform:"ENTERPRISE PEOPLE PLATFORM", headline:"One secure place to run your workforce.",
    description:"Core HR, attendance, shifts, payroll, recruitment, documents, performance, field workforce and analytics — structured for multi-location logistics operations.",
    authorized:"AUTHORIZED ACCESS", signIn:"Sign in", prompt:"Use your corporate HR ERP account.", email:"Email address", password:"Password", verifying:"Verifying…", secureSignIn:"Secure sign in",
    help:"Protected by rate limiting, secure session cookies and audit logging.", unable:"Unable to sign in", badges:["RBAC","Audit Logging","CSRF Protection","Secure Sessions","Data Scoping"]
  },
  topbar: { company:"ALTURUD INTERNATIONAL", title:"Human Resources ERP", search:"Search", notifications:"Notifications", signOut:"Sign out", signingOut:"Signing out…" },
  sidebar: {
    brand:"People ERP", footer:"Secure session · RBAC",
    groups:{core:"Core HR",workforce:"Workforce",peopleOps:"People Ops",services:"Services",insights:"Insights"},
    items:{dashboard:"Dashboard",employees:"Employees",organization:"Organization",attendance:"Attendance",shifts:"Shift Planning",leave:"Leave",workforce:"Field Workforce",recruitment:"Recruitment",onboarding:"Onboarding",performance:"Performance",training:"Learning",documents:"Documents",assets:"Assets",requests:"HR Services",approvals:"Approvals",relations:"Employee Relations",offboarding:"Offboarding",payroll:"Payroll",reports:"Reports",admin:"Administration"}
  },
  dashboard: {
    eyebrow:"WORKFORCE OVERVIEW", greeting:"Good evening", snapshot:"Operational workforce snapshot across ALTURUD locations.", employees:"Employees", presentToday:"Present today", openActions:"Open actions",
    activeWorkforce:"Active workforce",activeHint:"+12 this quarter",onLeave:"On leave today",leaveHint:"4.0% workforce",overtime:"Overtime this month",overtimeHint:"-6.2% vs last month",expiring:"Documents expiring ≤30d",expiringHint:"Requires HR action",
    trend:"Workforce trend",trendHint:"Headcount activity · last 12 months",allLocations:"All locations",actionCenter:"Action center",priority:"Priority items",leaveApprovals:"Leave approvals",overtimeApprovals:"Overtime approvals",contracts:"Contracts expiring",probation:"Probation reviews",missingDocuments:"Missing documents"
  },
  modulePage: {module:"MODULE",openItems:"Open items",needsAttention:"Requires attention",completed:"Completed",thisMonth:"This month",compliance:"Compliance",policyTarget:"Policy target 95%",exceptions:"Exceptions",reviewQueue:"Review queue",workspace:"Module workspace",select:"Select a workspace to continue.",search:"Search"},
  screenPage: {workspace:"WORKSPACE",searchRecords:"Search records",headers:["Reference","Department","Location","Status","Updated"],departments:["Operations","Warehouse","Finance","Operations","HR"],locations:["Muscat","Sohar","Muscat","Dubai","Muscat"],statuses:["Active","Pending","Active","Review","Active"]},
  employees: {eyebrow:"CORE HR",title:"Employees",subtitle:"Secure employee directory scoped to your organization and access role.",add:"+ Add employee",total:"Total employees",currentResult:"Current result set",active:"Active",employmentStatus:"Employment status",onLeave:"On leave",currentStatus:"Current status",dataScope:"Data scope",isolated:"Organization-isolated",search:"Search employees",dbError:"Database is not connected yet. Start PostgreSQL and run the migration/seed commands from README.",empty:"No employees yet. Create the first employee.",headers:["Employee","ID","Job title","Department","Branch","Status"],breadcrumb:"Employees",newEmployee:"New employee",createTitle:"Create employee",createSubtitle:"Add a new employee record. Sensitive fields are validated server-side and all changes are audit logged."},
  employeeForm:{employeeNo:"Employee no",workEmail:"Work email",firstName:"First name",lastName:"Last name",phone:"Phone",jobTitle:"Job title",employmentType:"Employment type",hireDate:"Hire date",status:"Status",cancel:"Cancel",saving:"Saving…",create:"Create employee",unable:"Unable to save employee"},
  employeeProfile:{overview:"Overview",employment:"Employment",attendance:"Attendance",leave:"Leave",documents:"Documents",performance:"Performance",training:"Training",assets:"Assets",timeline:"Timeline",title:"Employment overview",subtitle:"Core employee record",employmentType:"Employment type",hireDate:"Hire date",phone:"Phone",dataBoundary:"Data boundary",boundaryText:"Organization-scoped access enforced server-side."},
  forbidden:{title:"Access restricted",description:"Your role does not have permission to open this workspace.",back:"Return to dashboard"},
  status:{ACTIVE:"Active",ON_LEAVE:"On leave",SUSPENDED:"Suspended",TERMINATED:"Terminated",PENDING:"Pending",REVIEW:"Review"},
  employmentType:{FULL_TIME:"Full time",PART_TIME:"Part time",CONTRACT:"Contract",TEMPORARY:"Temporary"}
} as const;

export function ui(locale: Locale) {
  return locale === "ar" ? ar : en;
}

export function statusLabel(value: string, locale: Locale) {
  const dict = ui(locale).status as Record<string, string>;
  return dict[value] ?? value.replaceAll("_", " ");
}

export function employmentTypeLabel(value: string, locale: Locale) {
  const dict = ui(locale).employmentType as Record<string, string>;
  return dict[value] ?? value.replaceAll("_", " ");
}
