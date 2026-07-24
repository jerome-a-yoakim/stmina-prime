"use client";
import { useRouter } from "next/navigation";
export function SignOutButton() { const router=useRouter(); const signOut=async()=>{await fetch("/api/auth/sign-out",{method:"POST"});router.replace("/login");router.refresh();}; return <button type="button" onClick={signOut}>تسجيل الخروج</button>; }
