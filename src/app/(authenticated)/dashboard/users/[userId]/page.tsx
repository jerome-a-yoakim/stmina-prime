import { getUserProfile } from "@/features/users/data/user-service";
import { ManagementShell } from "@/features/users/components/management-shell";

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const user = await getUserProfile((await params).userId);
  return <ManagementShell title={user.full_name}>
    <div className="management-grid">
      <section className="management-card"><h2>بيانات الحساب</h2>
        <p>{user.contact_email || "لا يوجد بريد تواصل"}</p><p>{user.phone || "لا يوجد هاتف"}</p>
        <p>الحالة: {user.status_code}</p><p>آخر دخول: {user.last_login_at ? new Date(user.last_login_at).toLocaleString("ar-EG") : "—"}</p>
      </section>
      <section className="management-card"><h2>إحصاءات المتابعة</h2>
        <p>{user.statistics.length ? `${user.statistics.length} شهر مسجل` : "لا توجد إحصاءات بعد"}</p>
      </section>
    </div>
  </ManagementShell>;
}
