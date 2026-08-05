import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "خدمة مارمينا",
  description: "إدارة الحضور والخدمة",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      {/* suppressHydrationWarning silences mismatches caused by browser extensions
          (Grammarly, VS Code) that inject attributes into <body> at runtime. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
