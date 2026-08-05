import type { ReactNode } from "react";

export function ManagementShell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="page-stack">
    <header className="page-heading">
      <p className="management-eyebrow">إدارة الخدمة</p>
      <h1>{title}</h1>
    </header>
    {children}
  </div>;
}
