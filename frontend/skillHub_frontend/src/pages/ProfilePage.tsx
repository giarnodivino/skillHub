import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import LocationInput from "../components/LocationInput";

type ProfileUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  bio?: string;
  location?: string;
  latitude?: string | null;
  longitude?: string | null;
  service_radius_km?: string | number | null;
  hourly_rate?: string | number | null;
  services?: string;
  contractor_verification_status?: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  bio: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  serviceRadius: string;
  typicalRate: string;
  services: string;
  profilePicture: File | null;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  bio: "",
  location: "",
  latitude: null,
  longitude: null,
  serviceRadius: "",
  typicalRate: "",
  services: "",
  profilePicture: null,
};

function buildDefaultAvatar(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="80" fill="#ede9fe" />
      <circle cx="80" cy="66" r="32" fill="#8b5cf6" />
      <path d="M40 138c8-24 29-34 40-34s32 10 40 34" fill="#7c3aed" />
      <text x="80" y="152" text-anchor="middle" font-size="18" fill="#4c1d95" font-family="Arial, sans-serif">${initials}</text>
    </svg>
  `)}`;
}

function getProfilePictureUrl(path?: string | null) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `http://127.0.0.1:8000${path}`;
  }

  return `http://127.0.0.1:8000/media/${path}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("skillhub_access_token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await api.get("accounts/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = response.data as ProfileUser;
        setProfile(user);
        setForm({
          firstName: user.first_name ?? "",
          lastName: user.last_name ?? "",
          bio: user.bio ?? "",
          location: user.location ?? "",
          latitude: user.latitude ?? null,
          longitude: user.longitude ?? null,
          serviceRadius: user.service_radius_km ? String(user.service_radius_km) : "",
          typicalRate: user.hourly_rate ? String(user.hourly_rate) : "",
          services: user.services ?? "",
          profilePicture: null,
        });
      } catch {
        localStorage.removeItem("skillhub_access_token");
        localStorage.removeItem("skillhub_refresh_token");
        window.dispatchEvent(new Event("auth-state-changed"));
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [navigate]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    setForm((prev) => ({ ...prev, profilePicture: files?.[0] ?? null }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    const token = localStorage.getItem("skillhub_access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("first_name", form.firstName);
      payload.append("last_name", form.lastName);
      payload.append("bio", form.bio);
      payload.append("location", form.location);
      payload.append("latitude", form.latitude ?? "");
      payload.append("longitude", form.longitude ?? "");
      payload.append("services", form.services);

      if (form.serviceRadius.trim()) {
        payload.append("service_radius_km", form.serviceRadius);
      } else {
        payload.append("service_radius_km", "");
      }

      if (form.typicalRate.trim()) {
        payload.append("hourly_rate", form.typicalRate);
      }

      if (form.profilePicture) {
        payload.append("profile_picture", form.profilePicture);
      }

      const response = await api.patch("accounts/me/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfile(response.data as ProfileUser);
      setForm((prev) => ({ ...prev, profilePicture: null }));
      setMessage({ type: "success", text: "Your profile has been updated." });
      window.dispatchEvent(new Event("auth-state-changed"));
    } catch {
      setMessage({ type: "error", text: "We could not save your profile right now." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Loading your profile...
      </div>
    );
  }

  const isContractor = profile.role === "contractor";
  const profilePicture =
    getProfilePictureUrl(profile.profile_picture) ??
    buildDefaultAvatar(`${profile.first_name} ${profile.last_name}`.trim() || profile.email);
  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <img
            src={profilePicture}
            alt={fullName}
            className="h-28 w-28 rounded-full object-cover ring-4 ring-violet-100"
          />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">{fullName}</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-violet-600">{profile.role}</p>
          <p className="mt-2 text-sm text-slate-500">{profile.email}</p>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {profile.contractor_verification_status === "approved" ? (
              <span className="font-semibold text-emerald-600">Approved contractor account</span>
            ) : profile.contractor_verification_status === "pending" ? (
              <span className="font-semibold text-amber-600">Pending review</span>
            ) : (
              <span>Profile details are ready to update.</span>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Location</span>
            <span className="font-medium text-slate-900">{profile.location || "Not added yet"}</span>
          </div>
          {isContractor ? (
            <div className="flex items-center justify-between">
              <span>Service radius</span>
              <span className="font-medium text-slate-900">
                {profile.service_radius_km ? `${profile.service_radius_km} km` : "Not set"}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Typical rate</span>
            <span className="font-medium text-slate-900">
              {profile.hourly_rate ? `₱ ${profile.hourly_rate}` : "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Services</span>
            <span className="max-w-48 text-right font-medium text-slate-900">
              {profile.services || "Not listed yet"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Account overview</h2>
          <p className="mt-2 text-sm text-slate-500">
            {isContractor
              ? "Share the details clients see when they discover your profile."
              : "Keep your account details up to date and add a photo when you want."}
          </p>
        </div>

        {message ? (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}

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
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Profile picture</span>
            <input
              name="profilePicture"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-violet-500 focus:bg-white"
            />
          </label>

          {isContractor ? (
            <>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Bio</span>
                <textarea
                  name="bio"
                  rows={4}
                  value={form.bio}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="Tell clients what you do best."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Location</span>
                  <LocationInput
                    value={form.location}
                    latitude={form.latitude}
                    longitude={form.longitude}
                    onChange={(location) =>
                      setForm((prev) => ({
                        ...prev,
                        location: location.label,
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                    placeholder="Search city or address"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Typical rate</span>
                  <input
                    name="typicalRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.typicalRate}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                    placeholder="45"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Service radius (km)</span>
                <input
                  name="serviceRadius"
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={form.serviceRadius}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="15"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Services</span>
                <textarea
                  name="services"
                  rows={3}
                  value={form.services}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="Plumbing, House cleaning, Painting"
                />
              </label>
            </>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>
    </div>
  );
}
