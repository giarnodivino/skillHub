import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

type FormState = {
  email: string;
  password: string;
};

const initialForm: FormState = {
  email: "",
  password: "",
};

function getErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "We could not sign you in right now. Please try again.";
  }

  const entries = Object.entries(data as Record<string, unknown>);
  return entries
    .map(([field, value]) => {
      if (Array.isArray(value)) {
        return `${field}: ${value.join(" ")}`;
      }

      if (typeof value === "string") {
        return `${field}: ${value}`;
      }

      return `${field}: ${JSON.stringify(value)}`;
    })
    .join(" ");
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await api.post("accounts/token/", form);

      localStorage.setItem("skillhub_access_token", response.data.access);
      if (response.data.refresh) {
        localStorage.setItem("skillhub_refresh_token", response.data.refresh);
      }
      window.dispatchEvent(new Event("auth-state-changed"));

      setMessage({ type: "success", text: "Signed in successfully." });
      setForm(initialForm);
      setTimeout(() => navigate("/"), 900);
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" && error && "response" in error
          ? getErrorMessage((error as { response?: { data?: unknown } }).response?.data)
          : "We could not sign you in right now.";

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inline-block w-full rounded-4xl bg-linear-to-br from-violet-600 via-fuchsia-600 to-orange-400 p-2 shadow-2xl shadow-violet-900/20">
      <div className="grid overflow-hidden rounded-[1.7rem] bg-white/95 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium tracking-wide">
              Welcome back
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Sign in to continue finding trusted help for every job.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
              Access your dashboard, manage requests, and connect with the right professionals faster.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Why sign in?</p>
            <ul className="mt-3 space-y-2">
              <li>• Resume your projects in one place</li>
              <li>• Keep track of your preferred professionals</li>
            </ul>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Sign in to SkillHub</h2>
            <p className="mt-2 text-sm text-slate-500">Enter your email and password to continue.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Email address</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Password</span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                placeholder="Enter your password"
                required
              />
            </label>

            {message ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-500">
            Don’t have an account?{" "}
            <Link to="/register" className="font-semibold text-violet-600 hover:text-violet-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
