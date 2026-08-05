"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdministratorLoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/administrator", { method: "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      if (!response.ok) { setError("رمز الدخول غير صحيح"); return; }
      router.replace("/dashboard"); router.refresh();
    } catch { setError("رمز الدخول غير صحيح"); }
    finally { setPending(false); }
  }
  return <form className="card form login-form" onSubmit={submit}>
    <div><h1>تسجيل الدخول للادمن</h1></div>
    <label>رمز الدخول
      <input type="password" autoComplete="off" required value={code}
        onChange={(event) => setCode(event.target.value)} disabled={pending} autoFocus />
    </label>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="submit" disabled={pending} aria-busy={pending}>{pending ? "جارٍ الدخول…" : "دخول"}</button>
    <Link className="admin-login-link" href="/login">العودة لتسجيل الدخول العادي</Link>
  </form>;
}
