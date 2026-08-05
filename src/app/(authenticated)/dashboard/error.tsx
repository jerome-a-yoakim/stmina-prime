"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <main className="invitation-page">
      <section className="management-card invitation-card">
        <p className="management-eyebrow">تعذر تحميل الصفحة</p>
        <h1>حدث خطأ في بيانات لوحة التحكم</h1>
        <p>{error.message || "يرجى إعادة المحاولة أو العودة إلى لوحة التحكم."}</p>
        {error.digest && <small>رقم الخطأ: {error.digest}</small>}
        <div className="error-actions">
          <button type="button" onClick={reset}>إعادة المحاولة</button>
          <Link href="/dashboard">العودة إلى الرئيسية</Link>
        </div>
      </section>
    </main>
  );
}
