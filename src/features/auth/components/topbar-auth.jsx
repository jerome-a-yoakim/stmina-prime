import React from "react";
import { ROLE_LABELS } from "../authorization/role-definitions";

export function TopbarAuth({ currentUser, onLoginClick, onLogoutClick }) {
  if (!currentUser) {
    return (
      <button
        className="btn btn-primary btn-sm"
        onClick={onLoginClick}
        style={{ gap: 6, fontWeight: 800 }}
      >
        <span>🔑</span>
        <span>تسجيل الدخول</span>
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF5F2", border: "1px solid #F2E8E4", padding: "4px 10px", borderRadius: 20 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#E73F1E,#FB6C00)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 12
          }}
        >
          {currentUser.name ? currentUser.name[0] : "👤"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{currentUser.name}</span>
          <span style={{ fontSize: 10, color: "#E73F1E", fontWeight: 700 }}>{ROLE_LABELS[currentUser.role] || currentUser.role}</span>
        </div>
      </div>
      <button
        className="btn btn-ghost btn-xs"
        onClick={onLogoutClick}
        title="تسجيل الخروج"
        style={{ color: "#D84315", borderColor: "#F2E8E4", fontWeight: 800 }}
      >
        🚪 خروج
      </button>
    </div>
  );
}
