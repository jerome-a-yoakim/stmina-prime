import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { listOwnServantFollowUpRecords } from "@/features/servant-follow-up/data/follow-up-service";
import { getUserProfile } from "@/features/users/data/user-service";
import { ManagementShell } from "@/features/users/components/management-shell";

const yesNo = (value: boolean, yes = "حاضر", no = "غائب") => value ? yes : no;

export default async function MyProfilePage() {
  const actor = await requireActiveActor();
  const [profile, history] = await Promise.all([
    getUserProfile(actor.id),
    listOwnServantFollowUpRecords(),
  ]);
  return <ManagementShell title="ملفي الشخصي">
    <div className="management-grid">
      <section className="management-card"><h2>البيانات الشخصية</h2>
        <dl className="profile-details">
          <div><dt>الاسم</dt><dd>{profile.full_name}</dd></div>
          <div><dt>البريد الإلكتروني</dt><dd>{profile.contact_email || actor.email || "—"}</dd></div>
          <div><dt>الهاتف</dt><dd>{profile.phone || "—"}</dd></div>
          <div><dt>هاتف بديل</dt><dd>{profile.alternate_phone || "—"}</dd></div>
          <div><dt>حالة الحساب</dt><dd>{profile.status_code}</dd></div>
        </dl>
      </section>
      <section className="management-card"><h2>المتابعة</h2>
        <p>{history.length} سجل متابعة</p>
        <p className="management-note">سجلات المتابعة للعرض فقط. التعديل متاح لمدير النظام ومالك النظام.</p>
      </section>
    </div>
    <section className="management-card"><h2>سجل المتابعة الخاص بي</h2>
      <table><thead><tr><th>التاريخ</th><th>حضور خدمة الجمعة</th><th>حضور القداس</th><th>تحضير الدرس</th></tr></thead>
        <tbody>{history.map((row) => <tr key={row.id}><td>{row.follow_up_date}</td>
          <td>{yesNo(row.friday_service_attendance)}</td><td>{yesNo(row.liturgy_attendance)}</td>
          <td>{yesNo(row.lesson_preparation, "تم التحضير", "لم يتم")}</td></tr>)}
          {!history.length && <tr><td colSpan={4}>لا توجد سجلات متابعة حتى الآن.</td></tr>}</tbody>
      </table>
    </section>
    <div className="management-grid">
      <HistoryCard title="سجل حضور خدمة الجمعة" rows={history}
        value={(row) => yesNo(row.friday_service_attendance)} />
      <HistoryCard title="سجل حضور القداس" rows={history}
        value={(row) => yesNo(row.liturgy_attendance)} />
      <HistoryCard title="سجل تحضير الدرس" rows={history}
        value={(row) => yesNo(row.lesson_preparation, "تم التحضير", "لم يتم")} />
    </div>
  </ManagementShell>;
}

function HistoryCard({ title, rows, value }: {
  title: string;
  rows: Awaited<ReturnType<typeof listOwnServantFollowUpRecords>>;
  value: (row: Awaited<ReturnType<typeof listOwnServantFollowUpRecords>>[number]) => string;
}) {
  return <section className="management-card"><h2>{title}</h2>
    <table><thead><tr><th>التاريخ</th><th>الحالة</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}><td>{row.follow_up_date}</td><td>{value(row)}</td></tr>)}
        {!rows.length && <tr><td colSpan={2}>لا توجد بيانات.</td></tr>}</tbody>
    </table>
  </section>;
}
