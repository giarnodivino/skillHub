import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

type Role = "customer" | "contractor";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "customer",
};

const roleOptions: Array<{ value: Role; title: string; description: string }> = [
  {
    value: "customer",
    title: "Customer",
    description: "I need help with a project or service.",
  },
  {
    value: "contractor",
    title: "Contractor",
    description: "I offer services and want to connect with clients.",
  },
];

function getErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "We could not create your account right now. Please try again.";
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

export default function RegisterPage() {
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

    if (form.password !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("accounts/register/", {
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
        role: form.role,
      });

      setMessage({
        type: "success",
        text: "Account created successfully. You can now sign in.",
      });
      setForm(initialForm);
      setTimeout(() => navigate("/"), 1200);
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" && error && "response" in error
          ? getErrorMessage((error as { response?: { data?: unknown } }).response?.data)
          : "We could not create your account right now.";

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] rounded-[2rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-400 p-2 shadow-2xl shadow-violet-900/20">
      <div className="grid overflow-hidden rounded-[1.7rem] bg-white/95 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium tracking-wide">
              Join SkillHub
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Create an account and start connecting with trusted professionals.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
              Sign up as a customer to find help or as a contractor to grow your business.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Why join?</p>
            <ul className="mt-3 space-y-2">
              <li>• Quick and easy connection to trusted professionals</li>
              <li>• Role-based access tailored to your needs</li>
            </ul>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Create your account</h2>
            <p className="mt-2 text-sm text-slate-500">Choose how you want to use SkillHub.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                <span className="mb-1 block">First name</span>
                <input
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="Chloee"
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                <span className="mb-1 block">Last name</span>
                <input
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="Chua"
                  required
                />
              </label>
            </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                <span className="mb-1 block">Password</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                <span className="mb-1 block">Confirm password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="Repeat password"
                  minLength={8}
                  required
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Select your role</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((option) => {
                  const isSelected = form.role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, role: option.value }))}
                      className={`rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-violet-500 bg-violet-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-violet-300"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{option.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

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
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/" className="font-semibold text-violet-600 hover:text-violet-700">
              Go back home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
