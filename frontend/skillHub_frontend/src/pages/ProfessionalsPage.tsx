import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type Contractor = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: "contractor";
  profile_picture?: string | null;
  bio?: string;
  location?: string;
  hourly_rate?: string | number | null;
  services?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTypicalRate(rate?: string | number | null) {
  if (rate === null || rate === undefined || rate === "") {
    return "Rate not set";
  }

  return `Typical Rate: ₱ ${rate}`;
}

function getServiceTags(services?: string) {
  return (
    services
      ?.split(/[\n,]+/)
      .map((service) => service.trim())
      .filter(Boolean) ?? []
  );
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

function ProfessionalsPage() {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Contractor[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [startingConversationId, setStartingConversationId] = useState<number | null>(null);

  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get<Contractor[]>("accounts/contractors/");
        setProfessionals(response.data);
      } catch {
        setErrorMessage("We could not load professionals right now. Please try again in a moment.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfessionals();
  }, []);

  const filteredProfessionals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return professionals;
    }

    return professionals.filter((professional) => {
      const searchableText = [
        professional.name,
        professional.email,
        professional.first_name,
        professional.last_name,
        professional.role,
        professional.bio,
        professional.location,
        professional.hourly_rate,
        professional.services,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [professionals, query]);

  const handleStartConversation = async (contractorId: number) => {
    const token = localStorage.getItem("skillhub_access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setStartingConversationId(contractorId);
      setErrorMessage("");
      const response = await api.post<{ id: number }>(
        "chat/conversations/",
        { contractor_id: contractorId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      navigate(`/messages/${response.data.id}`);
    } catch {
      setErrorMessage("We could not start this chat. Customer accounts can message approved contractors.");
    } finally {
      setStartingConversationId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Find the right expert</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Browse trusted contractors and professionals</h1>
          <p className="mt-4 text-lg text-slate-300">
            Discover specialists for design, development, marketing, and operations — all in one place.
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500 lg:max-w-md"
          />

          <p className="text-sm font-medium text-slate-500">{professionals.length} contractors available</p>
        </div>
      </section>

      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
          Loading professionals...
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{errorMessage}</div>
      )}

      {!isLoading && !errorMessage && (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProfessionals.map((professional) => {
            const serviceTags = getServiceTags(professional.services);
            const profilePictureUrl = getProfilePictureUrl(professional.profile_picture);

            return (
              <article
                key={professional.id}
                className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt={professional.name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-sky-100"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg font-semibold text-sky-700">
                        {getInitials(professional.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="wrap-break-word text-lg font-semibold text-slate-900">{professional.name}</h2>
                      <p className="break-all text-sm text-slate-600">{professional.email}</p>
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Contractor
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>{professional.location?.trim() || "Location not added"}</span>
                  <span>•</span>
                  <span>{formatTypicalRate(professional.hourly_rate)}</span>
                </div>

                <p className="mt-4 wrap-break-word text-sm leading-6 text-slate-600">
                  {professional.bio?.trim() || "This professional has not added a business description yet."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {serviceTags.length > 0 ? (
                    serviceTags.map((service) => (
                      <span
                        key={service}
                        className="wrap-break-word rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {service}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Services not listed
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void handleStartConversation(professional.id)}
                    disabled={startingConversationId === professional.id}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {startingConversationId === professional.id ? "Opening..." : "Message"}
                  </button>
                  <span className="text-sm font-medium text-sky-600">Available for hire</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!isLoading && !errorMessage && filteredProfessionals.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          No professionals match your search yet. Try a broader keyword.
        </div>
      )}
    </div>
  );
}

export default ProfessionalsPage;
