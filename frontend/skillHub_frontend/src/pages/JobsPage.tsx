import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import LocationInput from "../components/LocationInput";

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name?: string;
  role: "customer" | "contractor" | "admin";
};

type Contractor = User & {
  profile_picture?: string | null;
  bio?: string;
  location?: string;
  hourly_rate?: string | number | null;
  services?: string;
};

type Quote = {
  id: number;
  job: number;
  contractor: Contractor;
  price: string;
  message: string;
  estimated_duration: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
};

type Review = {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
};

type Booking = {
  id: number;
  job: number;
  quote: Quote;
  customer: User;
  contractor: Contractor;
  scheduled_for?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  review?: Review | null;
};

type Job = {
  id: number;
  customer: User;
  contractor?: Contractor | null;
  title: string;
  category: string;
  description: string;
  location: string;
  latitude?: string | null;
  longitude?: string | null;
  budget?: string | null;
  preferred_start?: string | null;
  status: "requested" | "quoted" | "accepted" | "in_progress" | "completed" | "cancelled";
  quotes: Quote[];
  booking?: Booking | null;
  updated_at: string;
};

type JobForm = {
  title: string;
  category: string;
  description: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  budget: string;
  preferredStart: string;
};

type QuoteForm = {
  price: string;
  estimatedDuration: string;
  message: string;
};

type ReviewForm = {
  rating: string;
  comment: string;
};

const emptyJobForm: JobForm = {
  title: "",
  category: "",
  description: "",
  location: "",
  latitude: null,
  longitude: null,
  budget: "",
  preferredStart: "",
};

const emptyQuoteForm: QuoteForm = {
  price: "",
  estimatedDuration: "",
  message: "",
};

function getAuthHeaders() {
  const token = localStorage.getItem("skillhub_access_token");
  return token ? { Authorization: `Bearer ${token}` } : null;
}

function formatMoney(value?: string | number | null) {
  if (!value) {
    return "Not set";
  }
  return `₱ ${value}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function toApiDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function JobsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractorId = searchParams.get("contractorId");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobForm, setJobForm] = useState<JobForm>(emptyJobForm);
  const [quoteForms, setQuoteForms] = useState<Record<number, QuoteForm>>({});
  const [reviewForms, setReviewForms] = useState<Record<number, ReviewForm>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const headers = useMemo(() => getAuthHeaders(), []);
  const isCustomer = currentUser?.role === "customer";
  const isContractor = currentUser?.role === "contractor";

  const loadJobs = async () => {
    if (!headers) {
      navigate("/login");
      return;
    }

    const response = await api.get<Job[]>("marketplace/jobs/", { headers });
    setJobs(response.data);
  };

  useEffect(() => {
    const loadPage = async () => {
      if (!headers) {
        navigate("/login");
        return;
      }

      try {
        setIsLoading(true);
        setMessage(null);
        const [meResponse, jobsResponse] = await Promise.all([
          api.get<User>("accounts/me/", { headers }),
          api.get<Job[]>("marketplace/jobs/", { headers }),
        ]);
        setCurrentUser(meResponse.data);
        setJobs(jobsResponse.data);
      } catch {
        setMessage({ type: "error", text: "We could not load your jobs right now." });
      } finally {
        setIsLoading(false);
      }
    };

    void loadPage();
  }, [headers, navigate]);

  const handleCreateJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!headers) {
      navigate("/login");
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      await api.post(
        "marketplace/jobs/",
        {
          title: jobForm.title,
          category: jobForm.category,
          description: jobForm.description,
          location: jobForm.location,
          latitude: jobForm.latitude,
          longitude: jobForm.longitude,
          budget: jobForm.budget || null,
          preferred_start: toApiDate(jobForm.preferredStart),
          contractor_id: contractorId ? Number(contractorId) : null,
        },
        { headers },
      );
      setJobForm(emptyJobForm);
      setMessage({ type: "success", text: "Job request created. Contractors can now quote the work." });
      await loadJobs();
    } catch {
      setMessage({ type: "error", text: "We could not create this job request. Please check the details." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuoteChange = (jobId: number, key: keyof QuoteForm, value: string) => {
    setQuoteForms((prev) => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] ?? emptyQuoteForm),
        [key]: value,
      },
    }));
  };

  const handleCreateQuote = async (event: React.FormEvent<HTMLFormElement>, jobId: number) => {
    event.preventDefault();

    if (!headers) {
      navigate("/login");
      return;
    }

    const form = quoteForms[jobId] ?? emptyQuoteForm;

    try {
      setIsSaving(true);
      setMessage(null);
      await api.post(
        `marketplace/jobs/${jobId}/quotes/`,
        {
          price: form.price,
          estimated_duration: form.estimatedDuration,
          message: form.message,
        },
        { headers },
      );
      setQuoteForms((prev) => ({ ...prev, [jobId]: emptyQuoteForm }));
      setMessage({ type: "success", text: "Quote sent to the customer." });
      await loadJobs();
    } catch {
      setMessage({ type: "error", text: "We could not send this quote." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuoteAction = async (quoteId: number, action: "accept" | "decline" | "withdraw") => {
    if (!headers) {
      navigate("/login");
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      await api.post(`marketplace/quotes/${quoteId}/action/`, { action }, { headers });
      setMessage({ type: "success", text: action === "accept" ? "Quote accepted and booking created." : "Quote updated." });
      await loadJobs();
    } catch {
      setMessage({ type: "error", text: "We could not update this quote." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBookingStatus = async (bookingId: number, status: Booking["status"]) => {
    if (!headers) {
      navigate("/login");
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      await api.patch(`marketplace/bookings/${bookingId}/`, { status }, { headers });
      setMessage({ type: "success", text: "Booking updated." });
      await loadJobs();
    } catch {
      setMessage({ type: "error", text: "We could not update this booking." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewChange = (bookingId: number, key: keyof ReviewForm, value: string) => {
    setReviewForms((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] ?? { rating: "5", comment: "" }),
        [key]: value,
      },
    }));
  };

  const handleCreateReview = async (event: React.FormEvent<HTMLFormElement>, bookingId: number) => {
    event.preventDefault();

    if (!headers) {
      navigate("/login");
      return;
    }

    const form = reviewForms[bookingId] ?? { rating: "5", comment: "" };

    try {
      setIsSaving(true);
      setMessage(null);
      await api.post(
        `marketplace/bookings/${bookingId}/reviews/`,
        {
          rating: Number(form.rating),
          comment: form.comment,
        },
        { headers },
      );
      setMessage({ type: "success", text: "Review added. Thanks for closing the loop." });
      await loadJobs();
    } catch {
      setMessage({ type: "error", text: "We could not save this review." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">Work hub</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Jobs and bookings</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Create job requests, compare quotes, track accepted work, and review completed contractors.
          </p>
        </div>
        <Link
          to="/professionals"
          className="inline-flex w-fit rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Browse contractors
        </Link>
      </div>

      {message ? (
        <div
          className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Loading jobs...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-6">
            {isCustomer ? (
              <form onSubmit={handleCreateJob} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Create a job request</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {contractorId ? "This request will be sent to the selected contractor." : "Post the work you need done."}
                </p>

                <div className="mt-5 space-y-4">
                  <input
                    required
                    value={jobForm.title}
                    onChange={(event) => setJobForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Job title"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                  <input
                    value={jobForm.category}
                    onChange={(event) => setJobForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Category"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                  <textarea
                    required
                    rows={5}
                    value={jobForm.description}
                    onChange={(event) => setJobForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Describe the work"
                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                  <LocationInput
                    required
                    value={jobForm.location}
                    latitude={jobForm.latitude}
                    longitude={jobForm.longitude}
                    onChange={(location) =>
                      setJobForm((prev) => ({
                        ...prev,
                        location: location.label,
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }))
                    }
                    placeholder="Search job location"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={jobForm.budget}
                    onChange={(event) => setJobForm((prev) => ({ ...prev, budget: event.target.value }))}
                    placeholder="Budget"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                  <input
                    type="datetime-local"
                    value={jobForm.preferredStart}
                    onChange={(event) => setJobForm((prev) => ({ ...prev, preferredStart: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Post job"}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
                Approved contractors can quote open requests and update bookings after a customer accepts.
              </div>
            )}
          </aside>

          <section className="space-y-5">
            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                {isCustomer ? "No jobs yet. Create your first request to start hiring." : "No matching job requests yet."}
              </div>
            ) : (
              jobs.map((job) => {
                const myQuote = currentUser ? job.quotes.find((quote) => quote.contractor.id === currentUser.id) : null;
                const canQuote =
                  isContractor &&
                  !myQuote &&
                  ["requested", "quoted"].includes(job.status) &&
                  (!job.contractor || job.contractor.id === currentUser?.id);

                return (
                  <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            {statusLabel(job.status)}
                          </span>
                          {job.category ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {job.category}
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-3 wrap-break-word text-xl font-semibold text-slate-950">{job.title}</h2>
                        <p className="mt-2 wrap-break-word text-sm leading-6 text-slate-600">{job.description}</p>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:w-56">
                        <p>
                          <span className="font-semibold text-slate-900">Budget:</span> {formatMoney(job.budget)}
                        </p>
                        <p className="mt-2">
                          <span className="font-semibold text-slate-900">Location:</span> {job.location}
                        </p>
                        <p className="mt-2">
                          <span className="font-semibold text-slate-900">Preferred:</span> {formatDate(job.preferred_start)}
                        </p>
                      </div>
                    </div>

                    {job.booking ? (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-emerald-900">
                              Booking {statusLabel(job.booking.status)}
                            </p>
                            <p className="mt-1 text-sm text-emerald-700">
                              Contractor: {job.booking.contractor.name ?? job.booking.contractor.email} · Scheduled:{" "}
                              {formatDate(job.booking.scheduled_for)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isContractor && job.booking.status === "scheduled" ? (
                              <button
                                type="button"
                                onClick={() => void handleBookingStatus(job.booking!.id, "in_progress")}
                                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Start
                              </button>
                            ) : null}
                            {["scheduled", "in_progress"].includes(job.booking.status) ? (
                              <button
                                type="button"
                                onClick={() => void handleBookingStatus(job.booking!.id, "completed")}
                                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Complete
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {isCustomer && job.booking.status === "completed" && !job.booking.review ? (
                          <form
                            onSubmit={(event) => void handleCreateReview(event, job.booking!.id)}
                            className="mt-4 grid gap-3 md:grid-cols-[120px_1fr_auto]"
                          >
                            <select
                              value={reviewForms[job.booking.id]?.rating ?? "5"}
                              onChange={(event) => handleReviewChange(job.booking!.id, "rating", event.target.value)}
                              className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none"
                            >
                              {[5, 4, 3, 2, 1].map((rating) => (
                                <option key={rating} value={rating}>
                                  {rating} stars
                                </option>
                              ))}
                            </select>
                            <input
                              value={reviewForms[job.booking.id]?.comment ?? ""}
                              onChange={(event) => handleReviewChange(job.booking!.id, "comment", event.target.value)}
                              placeholder="Leave a review"
                              className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm outline-none"
                            />
                            <button type="submit" className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                              Review
                            </button>
                          </form>
                        ) : null}

                        {job.booking.review ? (
                          <p className="mt-3 text-sm text-emerald-800">
                            Reviewed: {job.booking.review.rating}/5 · {job.booking.review.comment || "No comment added."}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {canQuote ? (
                      <form
                        onSubmit={(event) => void handleCreateQuote(event, job.id)}
                        className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[140px_160px_1fr_auto]"
                      >
                        <input
                          required
                          type="number"
                          min="1"
                          step="0.01"
                          value={quoteForms[job.id]?.price ?? ""}
                          onChange={(event) => handleQuoteChange(job.id, "price", event.target.value)}
                          placeholder="Price"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                        />
                        <input
                          value={quoteForms[job.id]?.estimatedDuration ?? ""}
                          onChange={(event) => handleQuoteChange(job.id, "estimatedDuration", event.target.value)}
                          placeholder="Duration"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                        />
                        <input
                          value={quoteForms[job.id]?.message ?? ""}
                          onChange={(event) => handleQuoteChange(job.id, "message", event.target.value)}
                          placeholder="Quote note"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                        />
                        <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                          Quote
                        </button>
                      </form>
                    ) : null}

                    {job.quotes.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-950">Quotes</h3>
                        {job.quotes.map((quote) => (
                          <div
                            key={quote.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-950">
                                {quote.contractor.name ?? quote.contractor.email} · {formatMoney(quote.price)}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {quote.estimated_duration || "Duration not set"} · {statusLabel(quote.status)}
                              </p>
                              {quote.message ? <p className="mt-2 wrap-break-word text-sm text-slate-600">{quote.message}</p> : null}
                            </div>
                            {isCustomer && quote.status === "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleQuoteAction(quote.id, "decline")}
                                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                                >
                                  Decline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleQuoteAction(quote.id, "accept")}
                                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                                >
                                  Accept
                                </button>
                              </div>
                            ) : null}
                            {isContractor && quote.contractor.id === currentUser?.id && quote.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => void handleQuoteAction(quote.id, "withdraw")}
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                              >
                                Withdraw
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </div>
  );
}
