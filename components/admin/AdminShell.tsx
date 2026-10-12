"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button, inputClass, labelClass, Notice } from "@/components/admin/ui";
import { adminRpc, supabase } from "@/lib/admin/supabase";

type Gate = "loading" | "signed_out" | "not_admin" | "ready";

/** Signs the owner in with Supabase Auth and only renders the dashboard for admins. */
export function AdminShell({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const auth = supabase().auth;
    let alive = true;
    const check = async (s: Session | null) => {
      if (!alive) return;
      setSession(s);
      if (!s) return setGate("signed_out");
      try {
        setGate((await adminRpc<boolean>("ryzon_landing_is_admin", {})) ? "ready" : "not_admin");
      } catch {
        setGate("not_admin");
      }
    };
    auth.getSession().then(({ data }) => check(data.session));
    const { data } = auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") check(s);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (gate === "loading") return <p className="p-6 text-muted">Loading…</p>;
  if (gate === "signed_out") return <LoginForm />;
  if (gate === "not_admin")
    return (
      <div className="mx-auto max-w-measure p-6">
        <h1 className="font-display text-2xl font-heavy display-tight">No dashboard access</h1>
        <p className="mt-3">{session?.user.email} is signed in but is not a Ryzon admin.</p>
        <Button className="mt-6" onClick={() => supabase().auth.signOut()}>
          Sign Out
        </Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-display text-lg font-heavy display-tight">
            Ryzon pipeline
          </Link>
          <nav aria-label="Dashboard" className="flex flex-wrap items-center gap-1">
            <Link href="/admin?view=today" className="min-h-11 px-3 py-2 font-display text-sm font-bold underline-offset-4 hover:underline">
              Today
            </Link>
            <Link href="/admin?view=board" className="min-h-11 px-3 py-2 font-display text-sm font-bold underline-offset-4 hover:underline">
              Board
            </Link>
            <Link href="/admin?view=table" className="min-h-11 px-3 py-2 font-display text-sm font-bold underline-offset-4 hover:underline">
              Table
            </Link>
            <AccountMenu email={session?.user.email ?? ""} />
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-page px-4 py-6">
        {children}
      </main>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "That email and password don’t match." : error.message);
  };

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-measure px-4 py-16">
      <h1 className="font-display text-3xl font-heavy display-tight">Ryzon pipeline</h1>
      <p className="mt-2 text-muted">Sign in to manage demo requests, payments and launches.</p>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-card border-2 border-ink bg-surface p-5">
        <div>
          <label htmlFor="admin-email" className={labelClass}>
            Email
          </label>
          <input id="admin-email" name="email" type="email" autoComplete="username" spellCheck={false} autoCapitalize="off" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} mt-2`} />
        </div>
        <div>
          <label htmlFor="admin-password" className={labelClass}>
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>
        <Button type="submit" tone="primary" busy={busy} className="w-full">
          Sign In
        </Button>
        <Notice error={error} />
      </form>
    </main>
  );
}

function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ message?: string; error?: string }>({});

  const change = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 12) return setNote({ error: "Use at least 12 characters." });
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    setPassword("");
    setNote(error ? { error: error.message } : { message: "Password changed." });
  };

  return (
    <div className="relative">
      <Button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Account
      </Button>
      {open && (
        <div className="absolute right-0 z-header mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-card border-2 border-ink bg-surface p-4 shadow-hard">
          <p className="text-sm text-muted">Signed in as {email}</p>
          <form onSubmit={change} className="mt-4">
            <label htmlFor="new-password" className={labelClass}>
              New password
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} mt-2`}
            />
            <Button type="submit" busy={busy} className="mt-3 w-full">
              Change Password
            </Button>
            <Notice {...note} />
          </form>
          <Button tone="danger" className="mt-4 w-full" onClick={() => supabase().auth.signOut()}>
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
}
