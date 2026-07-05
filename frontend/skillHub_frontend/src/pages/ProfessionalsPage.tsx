import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import LocationInput from "../components/LocationInput";

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
  latitude?: string | null;
  longitude?: string | null;
  service_radius_km?: string | number | null;
  distance_km?: number | null;
  hourly_rate?: string | number | null;
  services?: string;
  average_rating?: number | null;
  review_count?: number;
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

function formatRating(rating?: number | null, count = 0) {
  if (!rating || count === 0) {
    return "No reviews yet";
  }

  return `${rating.toFixed(1)} (${count})`;
}

function getStarFill(star: number, rating?: number | null) {
  if (!rating) {
    return "text-slate-300";
  }

  return star <= Math.round(rating) ? "text-amber-400" : "text-slate-300";
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: "",
    latitude: null as string | null,
    longitude: null as string | null,
    radius: "15",
    minRating: "",
    minReviews: "",
    minRate: "",
    maxRate: "",
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [startingConversationId, setStartingConversationId] = useState<number | null>(null);

  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const params =
          filters.latitude && filters.longitude
            ? { lat: filters.latitude, lng: filters.longitude, radius_km: filters.radius || "15" }
            : undefined;
        const response = await api.get<Contractor[]>("accounts/contractors/", { params });
        setProfessionals(response.data);
      } catch {
        setErrorMessage("We could not load professionals right now. Please try again in a moment.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfessionals();
  }, [filters.latitude, filters.longitude, filters.radius]);

  const filteredProfessionals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const minRating = Number(filters.minRating);
    const minReviews = Number(filters.minReviews);
    const minRate = Number(filters.minRate);
    const maxRate = Number(filters.maxRate);

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

      const matchesQuery = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
      const rating = professional.average_rating ?? 0;
      const reviewCount = professional.review_count ?? 0;
      const rate = Number(professional.hourly_rate ?? 0);

      return (
        matchesQuery &&
        (!filters.minRating || rating >= minRating) &&
        (!filters.minReviews || reviewCount >= minReviews) &&
        (!filters.minRate || rate >= minRate) &&
        (!filters.maxRate || (rate > 0 && rate <= maxRate))
      );
    });
  }, [filters.maxRate, filters.minRate, filters.minRating, filters.minReviews, professionals, query]);

  const activeFilterCount = [
    filters.latitude && filters.longitude,
    filters.minRating,
    filters.minReviews,
    filters.minRate,
    filters.maxRate,
  ].filter(Boolean).length;

  const handleApplyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      location: "",
      latitude: null,
      longitude: null,
      radius: "15",
      minRating: "",
      minReviews: "",
      minRate: "",
      maxRate: "",
    };
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setIsFiltersOpen(false);
  };

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
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, service, or email"
              className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500"
            />

            <button
              type="button"
              onClick={() => {
                setDraftFilters(filters);
                setIsFiltersOpen(true);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>
              ) : null}
            </button>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {filteredProfessionals.length} of {professionals.length} contractors shown
          </p>
        </div>
      </section>

      {isFiltersOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40 px-4 py-6 sm:items-center sm:justify-center">
          <form
            onSubmit={handleApplyFilters}
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Filters</h2>
                <p className="mt-1 text-sm text-slate-500">Narrow contractors by distance, reviews, and rate.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-[1fr_150px]">
                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Location</span>
                  <LocationInput
                    value={draftFilters.location}
                    latitude={draftFilters.latitude}
                    longitude={draftFilters.longitude}
                    onChange={(location) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        location: location.label,
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }))
                    }
                    placeholder="Search near a real location"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Radius km</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={draftFilters.radius}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, radius: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Minimum rating</span>
                  <select
                    value={draftFilters.minRating}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, minRating: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500"
                  >
                    <option value="">Any rating</option>
                    <option value="5">5 stars</option>
                    <option value="4">4+ stars</option>
                    <option value="3">3+ stars</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Minimum reviews</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draftFilters.minReviews}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, minReviews: event.target.value }))}
                    placeholder="e.g. 3"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Minimum typical rate</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={draftFilters.minRate}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, minRate: event.target.value }))}
                    placeholder="₱ min"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Maximum typical rate</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={draftFilters.maxRate}
                    onChange={(event) => setDraftFilters((prev) => ({ ...prev, maxRate: event.target.value }))}
                    placeholder="₱ max"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-sky-500"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Apply filters
              </button>
            </div>
          </form>
        </div>
      ) : null}

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
                  {professional.distance_km !== null && professional.distance_km !== undefined ? (
                    <>
                      <span>•</span>
                      <span>{professional.distance_km.toFixed(1)} km away</span>
                    </>
                  ) : null}
                  <span>•</span>
                  <span>{formatTypicalRate(professional.hourly_rate)}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="flex" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={getStarFill(star, professional.average_rating)}>
                          ★
                        </span>
                      ))}
                    </span>
                    <span>{formatRating(professional.average_rating, professional.review_count ?? 0)}</span>
                  </span>
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/new?contractorId=${professional.id}`)}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Hire
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStartConversation(professional.id)}
                      disabled={startingConversationId === professional.id}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {startingConversationId === professional.id ? "Opening..." : "Message"}
                    </button>
                  </div>
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
