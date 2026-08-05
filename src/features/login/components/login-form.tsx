"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور ثم حاول مجددًا.");
    } finally {
      setPending(false);
    }
  }

  return <form className="card form login-form" onSubmit={submit}>
    <div><h1>خدمة مارمينا</h1><p>تسجيل دخول الخدام والإدارة</p></div>
    <label>البريد الإلكتروني
      <input type="email" autoComplete="email" inputMode="email" required value={email}
        onChange={(event) => setEmail(event.target.value)} disabled={pending} />
    </label>
    <label>كلمة المرور
      <input type="password" autoComplete="current-password" minLength={8} required value={password}
        onChange={(event) => setPassword(event.target.value)} disabled={pending} />
    </label>
    <label className="remember-me">
      <input type="checkbox" checked={rememberMe}
        onChange={(event) => setRememberMe(event.target.checked)} disabled={pending} />
      <span><strong>تذكرني</strong><small>الاستمرار في تسجيل الدخول على هذا الجهاز</small></span>
    </label>
    {error && <p className="error" role="alert">{error}</p>}
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
    </button>
    <Link className="admin-login-link" href="/administrator-login">تسجيل الدخول للادمن</Link>
  </form>;
}
