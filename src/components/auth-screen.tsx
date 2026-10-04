"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatSingaporePhone } from "@/lib/phone";

type Screen = "welcome" | "register" | "login" | "code";

export function AuthScreen({ previewMode }: { previewMode: boolean }) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const clearMessage = () => {
    setNotice("");
    setError("");
  };

  async function register() {
    clearMessage();
    setBusy(true);
    if (previewMode) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setNotice(
        "Registration saved. You can now sign in with your phone number.",
      );
      setScreen("login");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "We could not save your registration.");
      setPhone(result.phone);
      setNotice(
        "Registration saved. You can now sign in with your phone number.",
      );
      setScreen("login");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We could not save your registration.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    clearMessage();
    setBusy(true);
    if (previewMode) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setPhone(phone || "+65 8123 4567");
      setScreen("code");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === "REGISTER_FIRST") setScreen("register");
        throw new Error(result.error ?? "We could not send a code.");
      }
      setPhone(result.phone);
      setScreen("code");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "We could not send a code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    clearMessage();
    setBusy(true);
    if (previewMode) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      window.location.assign("/portal");
      return;
    }
    try {
      const supabase = getBrowserSupabase();
      if (!supabase) throw new Error("The portal is not configured yet.");
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      window.location.assign("/portal");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "That code could not be verified.",
      );
      setBusy(false);
    }
  }

  const title =
    screen === "register"
      ? "Register your details"
      : screen === "code"
        ? "Enter your login code"
        : "Sign in to your evidence";
  const back =
    screen === "welcome"
      ? null
      : () => {
          clearMessage();
          setScreen(screen === "code" ? "login" : "welcome");
        };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#d5f0ee,_transparent_35%),linear-gradient(145deg,_#f7fafb,_#e9f0f4)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center">
        <section className="grid w-full overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(23,56,95,0.15)] lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="hidden bg-navy p-12 text-white lg:block">
            <Brand />
            <div className="mt-24 max-w-sm">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-200">
                A safe, simple process
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight">
                Keep your project evidence in one place.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-200">
                Upload your documents, payment records and other relevant files
                whenever you are ready.
              </p>
            </div>
            <div className="mt-16 flex items-center gap-3 text-sm text-slate-300">
              <ShieldCheck size={22} /> Your files are visible only to you and
              authorised administrators.
            </div>
          </aside>
          <section className="px-6 py-8 sm:px-12 sm:py-12">
            <div className="flex items-center justify-between lg:hidden">
              <Brand />
              <span className="text-sm font-bold text-slate-500">
                Evidence Portal
              </span>
            </div>
            {previewMode && (
              <div className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                <strong>Preview mode.</strong> You can explore the completed
                experience using sample data. Add your provider settings to turn
                on live login and storage.
              </div>
            )}
            {back && (
              <button
                onClick={back}
                className="mt-8 inline-flex min-h-11 items-center gap-2 text-base font-bold text-navy hover:underline"
              >
                <ArrowLeft size={20} /> Back
              </button>
            )}
            <div className={back || previewMode ? "mt-8" : "mt-20"}>
              <h2 className="text-3xl font-extrabold tracking-tight text-ink">
                {title}
              </h2>
              <p className="mt-3 max-w-md text-lg leading-7 text-slate-600">
                {screen === "register"
                  ? "Use the name and mobile number that the team has for you."
                  : screen === "code"
                    ? `We sent a six-digit code to ${formatSingaporePhone(phone)}.`
                    : "Use your Singapore mobile number to receive a one-time login code."}
              </p>
            </div>
            {notice && (
              <div className="mt-7 flex gap-3 rounded-xl bg-teal-50 p-4 text-base text-teal-900">
                <CheckCircle2 className="mt-0.5 shrink-0" size={21} />
                {notice}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mt-7 rounded-xl bg-rose-50 p-4 text-base text-rose-900"
              >
                {error}
              </div>
            )}

            {screen === "welcome" && (
              <div className="mt-9 space-y-4">
                <button
                  className="button-primary w-full"
                  onClick={() => {
                    clearMessage();
                    setScreen("login");
                  }}
                >
                  Sign in
                </button>
                <button
                  className="button-secondary w-full"
                  onClick={() => {
                    clearMessage();
                    setScreen("register");
                  }}
                >
                  Register for the first time
                </button>
              </div>
            )}
            {screen === "register" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  register();
                }}
                className="mt-9 space-y-6"
              >
                <div>
                  <label className="field-label" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    className="field-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="For example, Mary Tan"
                    autoComplete="name"
                    required
                  />
                </div>
                <PhoneField value={phone} onChange={setPhone} />
                <button className="button-primary w-full" disabled={busy}>
                  {busy && <LoaderCircle className="animate-spin" size={20} />}
                  Save and continue
                </button>
              </form>
            )}
            {screen === "login" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  requestCode();
                }}
                className="mt-9 space-y-6"
              >
                <PhoneField value={phone} onChange={setPhone} />
                <button className="button-primary w-full" disabled={busy}>
                  {busy && <LoaderCircle className="animate-spin" size={20} />}
                  Send login code
                </button>
                <p className="text-center text-base text-slate-600">
                  Not registered yet?{" "}
                  <button
                    type="button"
                    onClick={() => setScreen("register")}
                    className="font-bold text-navy underline"
                  >
                    Register first
                  </button>
                </p>
              </form>
            )}
            {screen === "code" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  verifyCode();
                }}
                className="mt-9 space-y-6"
              >
                <div>
                  <label className="field-label" htmlFor="code">
                    Six-digit login code
                  </label>
                  <input
                    id="code"
                    className="field-input text-center text-2xl tracking-[0.45em]"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    autoFocus
                    required
                  />
                </div>
                <button
                  className="button-primary w-full"
                  disabled={busy || code.length !== 6}
                >
                  {busy && <LoaderCircle className="animate-spin" size={20} />}
                  Sign in
                </button>
                <button
                  type="button"
                  className="mx-auto block min-h-11 text-base font-bold text-navy underline"
                  onClick={requestCode}
                  disabled={busy}
                >
                  Send another code
                </button>
              </form>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="field-label" htmlFor="phone">
        Singapore mobile number
      </label>
      <div className="flex">
        <span className="flex min-h-12 items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 px-4 text-lg font-bold text-slate-700">
          +65
        </span>
        <input
          id="phone"
          className="field-input rounded-l-none"
          value={value.replace(/^\+65\s?/, "")}
          onChange={(event) => onChange(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="8123 4567"
          required
        />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        We will send a one-time code to this number when you sign in.
      </p>
    </div>
  );
}
