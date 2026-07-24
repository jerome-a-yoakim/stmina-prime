import type { Metadata } from "next"; import type { ReactNode } from "react"; import "@/presentation/styles/globals.css";
export const metadata: Metadata={title:"خدمة مارمينا",description:"إدارة الحضور والخدمة"};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>;}
