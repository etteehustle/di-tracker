"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabase } from "../../lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function submit(mode: "sign-in" | "sign-up") {
    if (!supabase) return;
    if (!email.trim() || password.length < 6) {
      toast.error("Use an email and a password with at least 6 characters.");
      return;
    }

    setIsBusy(true);
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setIsBusy(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(mode === "sign-up" ? "Account created. Check email if confirmation is required." : "Signed in.");
  }

  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <div className="auth-brand">
          <span>DI Tracker</span>
          <h1>Cloud ledger access</h1>
          <p>Sign in to keep your DI ledger synced between desktop and phone.</p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="auth-email">Email</FieldLabel>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="auth-password">Password</FieldLabel>
            <Input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <div className="auth-actions">
          <Button type="button" disabled={isBusy} onClick={() => void submit("sign-in")}>
            Sign in
          </Button>
          <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void submit("sign-up")}>
            Create account
          </Button>
        </div>
      </Card>
    </main>
  );
}
