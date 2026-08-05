import React from "react";

export function AccessDeniedPage({ onGoHome }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "#ffffff", borderRadius: 16, border: "1px solid #F2E8E4", margin: "20px 0" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1E1B4B", marginBottom: 8 }}>غير مصرح بالوصول (Access Denied)</h2>
      <p style={{ fontSize: 13, color: "#6B7280", maxWidth: 450, margin: "0 auto 24px", lineHeight: 1.6 }}>
        عفواً، لا تملك الصلاحيات الكافية لاستعراض هذه الصفحة أو الميزة. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مدير النظام.
      </p>
      {onGoHome && (
        <button className="btn btn-primary" onClick={onGoHome}>
          العودة للوحة الرئيسية 🏠
        </button>
      )}
    </div>
  );
}
