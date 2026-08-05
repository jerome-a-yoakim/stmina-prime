export interface NavPermissionContext {
  canManageServantFollowUp: boolean;
  canViewVisitation: boolean;
  canViewAllNotifications?: boolean;
}

export interface NavigationItem {
  id: string;
  route: string;
  label: string;
  icon: string;
  group: "overview" | "service" | "servants" | "system";
  groupLabel: string;
  order: number;
  description?: string;
  permissionCheck?: (ctx: NavPermissionContext) => boolean;
  children?: NavigationItem[];
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  route?: string;
  icon?: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    route: "/dashboard",
    label: "الرئيسية",
    icon: "dashboard",
    group: "overview",
    groupLabel: "نظرة عامة",
    order: 1,
    description: "لوحة التحكم الرئيسية وإحصائيات الخدمة",
  },
  {
    id: "dashboard-me",
    route: "/dashboard/me",
    label: "لوحتي الشخصية",
    icon: "person",
    group: "overview",
    groupLabel: "نظرة عامة",
    order: 2,
    description: "الملف الشخصي والبيانات الخاصة بالخادم",
  },
  {
    id: "members",
    route: "/members",
    label: "المخدومين والأسر",
    icon: "groups",
    group: "service",
    groupLabel: "الخدمة",
    order: 3,
    description: "إدارة بيانات المخدومين والافتراضات والأسر",
  },
  {
    id: "attendance",
    route: "/attendance",
    label: "الحضور",
    icon: "fact_check",
    group: "service",
    groupLabel: "الخدمة",
    order: 4,
    description: "تسجيل متابعة الحضور والغياب الأسبوعي",
  },
  {
    id: "visitation",
    route: "/visitation",
    label: "حالة الافتقاد",
    icon: "home_health",
    group: "service",
    groupLabel: "الخدمة",
    order: 5,
    description: "سجلات الافتقاد ومتابعة الحالات العاجلة",
    permissionCheck: (ctx) => ctx.canViewVisitation,
  },
  {
    id: "activities",
    route: "/activities",
    label: "الأنشطة",
    icon: "local_activity",
    group: "service",
    groupLabel: "الخدمة",
    order: 6,
    description: "الفعاليات والأنشطة الخادمة",
  },
  {
    id: "reports",
    route: "/reports",
    label: "التقارير",
    icon: "analytics",
    group: "service",
    groupLabel: "الخدمة",
    order: 7,
    description: "التقارير الشاملة والإحصائيات التجميعية",
  },
  {
    id: "users",
    route: "/users",
    label: "المستخدمون",
    icon: "manage_accounts",
    group: "servants",
    groupLabel: "الخدام",
    order: 8,
    description: "إدارة حسابات الخدام والصلاحيات",
  },
  {
    id: "announcements",
    route: "/announcements",
    label: "الإعلانات",
    icon: "campaign",
    group: "servants",
    groupLabel: "الخدام",
    order: 9,
    description: "إعلانات الخدمة والتنبيهات العامة",
  },
  {
    id: "servant-followup",
    route: "/servant-followup",
    label: "متابعة الخدام",
    icon: "assignment_ind",
    group: "servants",
    groupLabel: "الخدام",
    order: 10,
    description: "متابعة وتقييم أداء وتكليفات الخدام",
    permissionCheck: (ctx) => ctx.canManageServantFollowUp,
  },
  {
    id: "settings",
    route: "/settings",
    label: "الإعدادات والنسخ الاحتياطية",
    icon: "settings",
    group: "system",
    groupLabel: "النظام",
    order: 11,
    description: "إعدادات النظام والنسخ الاحتياطية",
  },
];

/**
 * Filter navigation items according to current actor permissions.
 */
export function getVisibleNavigationItems(ctx: NavPermissionContext): NavigationItem[] {
  return NAVIGATION_ITEMS.filter((item) => !item.permissionCheck || item.permissionCheck(ctx)).sort(
    (a, b) => a.order - b.order
  );
}

/**
 * Group visible navigation items by section.
 */
export function getNavigationGroups(ctx: NavPermissionContext): NavigationGroup[] {
  const visible = getVisibleNavigationItems(ctx);
  const groupMap = new Map<string, NavigationGroup>();

  for (const item of visible) {
    if (!groupMap.has(item.group)) {
      groupMap.set(item.group, {
        id: item.group,
        label: item.groupLabel,
        items: [],
      });
    }
    groupMap.get(item.group)!.items.push(item);
  }

  return Array.from(groupMap.values());
}

/**
 * Check if a route matches current pathname.
 */
export function isRouteActive(route: string, pathname: string): boolean {
  if (route === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/";
  }
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Find active navigation item from current pathname.
 */
export function findActiveNavigationItem(pathname: string): NavigationItem | undefined {
  return NAVIGATION_ITEMS.find((item) => isRouteActive(item.route, pathname));
}

/**
 * Generate breadcrumbs dynamically based on current pathname and config.
 */
export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ label: "الرئيسية", route: "/dashboard", icon: "dashboard" }];

  const activeItem = findActiveNavigationItem(pathname);
  if (activeItem && activeItem.route !== "/dashboard") {
    breadcrumbs.push({
      label: activeItem.groupLabel,
    });
    breadcrumbs.push({
      label: activeItem.label,
      route: activeItem.route,
      icon: activeItem.icon,
    });
  }

  return breadcrumbs;
}

/**
 * Helper to get quick navigation cards.
 */
export function getQuickNavigationItems(ctx: NavPermissionContext): NavigationItem[] {
  return getVisibleNavigationItems(ctx).filter((item) => item.route !== "/dashboard");
}
