"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Lang = "en" | "ur";
export type AccountIdentity = { id: string; email: string | null };

export default function AccountAuth({ lang, onAuthChange }: {
  lang: Lang;
  onAuthChange: (account: AccountIdentity | null) => void;
}) {
  const [account, setAccount] = useState<AccountIdentity | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const initialize = window.setTimeout(() => {
      try {
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          const user = session?.user ?? null;
          const identity = user ? { id: user.id, email: user.email ?? null } : null;
          if (active) setAccount(identity);
          onAuthChange(identity);
        });
        unsubscribe = () => subscription.unsubscribe();
        void supabase.auth.getUser().then(({ data, error: authError }) => {
          if (!active) return;
          if (authError) setError("Could not check your account session.");
          const identity = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
          setAccount(identity);
          onAuthChange(identity);
          setChecking(false);
        }).catch(() => {
          if (active) {
            setError("Could not connect to account services.");
            setChecking(false);
          }
        });
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Account services are not configured.");
          setChecking(false);
        }
      }
    }, 0);
    return () => { active = false; window.clearTimeout(initialize); unsubscribe(); };
  }, [onAuthChange]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "sign-up") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage(lang === "ur" ? "اپنا ای میل چیک کریں اور تصدیقی لنک کھولیں۔" : "Check your email and open the confirmation link to finish signing up.");
        } else {
          setMessage(lang === "ur" ? "آپ کا اکاؤنٹ تیار ہے۔" : "Your account is ready.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await createClient().auth.signOut();
      if (authError) throw authError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="subah-account" aria-label={lang === "ur" ? "اکاؤنٹ" : "Account"}>
    <div className="subah-account__heading">
      <h3>{lang === "ur" ? "سُبح اکاؤنٹ" : "Subah Account"}</h3>
      <p>{lang === "ur" ? "سائن اِن کر کے اپنی پسند اور ایڈیشنز اپنے اکاؤنٹ سے ہم آہنگ کریں۔" : "Sign in to sync your reading profile and saved editions."}</p>
    </div>
    {checking ? <p className="subah-filter-help" aria-live="polite">{lang === "ur" ? "اکاؤنٹ چیک ہو رہا ہے…" : "Checking account…"}</p> : account ? <div className="subah-account__signed-in">
      <p>{lang === "ur" ? "سائن اِن ہیں" : "Signed in"}: <span dir="ltr">{account.email}</span></p>
      <button type="button" className="subah-btn subah-btn--outline" disabled={busy} onClick={() => void signOut()}>{lang === "ur" ? "سائن آؤٹ" : "Sign out"}</button>
    </div> : <>
      <div className="subah-account__tabs" role="group" aria-label={lang === "ur" ? "اکاؤنٹ عمل" : "Account action"}>
        <button type="button" className={`subah-chip${mode === "sign-in" ? " subah-chip--active" : ""}`} aria-pressed={mode === "sign-in"} onClick={() => { setMode("sign-in"); setError(null); setMessage(null); }}>{lang === "ur" ? "سائن اِن" : "Sign in"}</button>
        <button type="button" className={`subah-chip${mode === "sign-up" ? " subah-chip--active" : ""}`} aria-pressed={mode === "sign-up"} onClick={() => { setMode("sign-up"); setError(null); setMessage(null); }}>{lang === "ur" ? "اکاؤنٹ بنائیں" : "Create account"}</button>
      </div>
      <form className="subah-account__form" onSubmit={submit}>
        <label>{lang === "ur" ? "ای میل" : "Email"}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>{lang === "ur" ? "پاس ورڈ" : "Password"}<input type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button type="submit" className="subah-btn subah-btn--primary" disabled={busy}>{busy ? (lang === "ur" ? "براہِ کرم انتظار کریں…" : "Please wait…") : mode === "sign-up" ? (lang === "ur" ? "اکاؤنٹ بنائیں" : "Create account") : (lang === "ur" ? "سائن اِن" : "Sign in")}</button>
      </form>
    </>}
    {error && <p className="subah-profile-error" role="alert">{error}</p>}
    {message && <p className="subah-filter-help" role="status">{message}</p>}
  </section>;
}
