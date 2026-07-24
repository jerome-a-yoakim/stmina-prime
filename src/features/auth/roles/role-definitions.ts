import { Permission, PermissionCategory, Role } from "../types/auth";

export const ALL_PERMISSIONS: Permission[] = [
  "view_family_members",
  "edit_family_members",
  "view_member_profiles",
  "edit_member_profiles",
  "attendance_access",
  "view_family_stats",
  "reports_access",
  "user_management",
  "audit_logs",
  "settings_access",
  "view_notes",
  "add_notes",
  "edit_notes",
  "delete_notes",
  "export_member_report"
];

export const PERMISSION_GROUPS: Record<PermissionCategory, { key: Permission; label: string }[]> = {
  Members: [
    { key: "view_family_members", label: "عرض أعضاء الأسرة" },
    { key: "edit_family_members", label: "تعديل وإضافة أعضاء الأسرة" },
    { key: "view_notes", label: "استعراض ملاحظات الأعضاء" },
    { key: "add_notes", label: "إضافة ملاحظات جديدة" },
    { key: "edit_notes", label: "تعديل الملاحظات" },
    { key: "delete_notes", label: "حذف الملاحظات" }
  ],
  Profiles: [
    { key: "view_member_profiles", label: "عرض الملف الشخصي للأعضاء" },
    { key: "edit_member_profiles", label: "تعديل الملف الشخصي للأعضاء" }
  ],
  Attendance: [
    { key: "attendance_access", label: "تسجيل وتسليم بيانات الحضور الأسبوعية" }
  ],
  Statistics: [
    { key: "view_family_stats", label: "عرض إحصائيات الأسرة والرسوم البيانية" }
  ],
  Reports: [
    { key: "reports_access", label: "تصدير السجلات والتقارير الأسبوعية" },
    { key: "export_member_report", label: "تصدير تقرير العضو الشامل (PDF)" }
  ],
  Administration: [
    { key: "user_management", label: "إدارة المستخدمين والحسابات" },
    { key: "audit_logs", label: "استعراض سجلات التدقيق والتغييرات (Audit Logs)" }
  ],
  Settings: [
    { key: "settings_access", label: "إدارة النظام والنسخ الاحتياطية" }
  ]
};

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  family: [
    "view_family_members",
    "edit_family_members",
    "view_member_profiles",
    "view_family_stats",
    "attendance_access",
    "view_notes",
    "add_notes",
    "edit_notes",
    "export_member_report"
  ],
  servant: [
    "view_family_members",
    "edit_family_members",
    "view_member_profiles",
    "view_family_stats",
    "attendance_access",
    "view_notes",
    "add_notes",
    "edit_notes",
    "export_member_report"
  ],
  teacher: [
    "view_family_members",
    "view_member_profiles",
    "view_family_stats",
    "view_notes"
  ],
  class_leader: [
    "view_family_members",
    "edit_family_members",
    "view_member_profiles",
    "view_family_stats",
    "attendance_access",
    "view_notes",
    "add_notes",
    "edit_notes",
    "export_member_report"
  ],
  secretary: [
    "view_family_members",
    "edit_family_members",
    "view_member_profiles",
    "edit_member_profiles",
    "reports_access",
    "view_notes",
    "add_notes",
    "export_member_report"
  ]
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "مدير النظام (Administrator)",
  family: "حساب الأسرة (Family Account)",
  servant: "خادم (Servant)",
  teacher: "مدرس (Teacher)",
  class_leader: "أمين أسرة (Class Leader)",
  secretary: "سكرتارية (Secretary)"
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_family_members: "عرض أعضاء الأسرة",
  edit_family_members: "تعديل وإضافة أعضاء الأسرة",
  view_member_profiles: "عرض الملف الشخصي للأعضاء",
  edit_member_profiles: "تعديل الملف الشخصي للأعضاء",
  attendance_access: "تسجيل وتسليم بيانات الحضور الأسبوعية",
  view_family_stats: "عرض إحصائيات الأسرة",
  reports_access: "تصدير السجلات والتقارير",
  user_management: "إدارة المستخدمين والحسابات",
  audit_logs: "استعراض سجلات التدقيق",
  settings_access: "إدارة النظام والنسخ الاحتياطية",
  view_notes: "استعراض ملاحظات الأعضاء",
  add_notes: "إضافة ملاحظات جديدة",
  edit_notes: "تعديل الملاحظات",
  delete_notes: "حذف الملاحظات",
  export_member_report: "تصدير تقرير العضو الشامل (PDF)"
};
