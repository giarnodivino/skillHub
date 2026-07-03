import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

type ContractorApplicant = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  has_government_id: boolean;
  contractor_verification_status: string;
  is_active: boolean;
};

type MessageState = {
  type: "success" | "error";
  text: string;
};

function getMediaUrl(path?: string | null) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";
  const mediaBaseUrl = baseUrl.replace(/\/api\/?$/, "");
  return `${mediaBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getAuthHeaders() {
  const token = localStorage.getItem("skillhub_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminReviewPage() {
  const [applicants, setApplicants] = useState<ContractorApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const loadApplicants = async () => {
      try {
        const meResponse = await api.get("accounts/me/", { headers: getAuthHeaders() });
        if (meResponse.data.role !== "admin") {
          setMessage({ type: "error", text: "Admin access is required to view this page." });
          setLoading(false);
          return;
        }

        const response = await api.get("accounts/admin/contractors/", {
          headers: getAuthHeaders(),
        });

        setApplicants(response.data);
      } catch (error) {
        setMessage({
          type: "error",
          text: "Unable to load contractor applications. Please sign in as an admin and try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadApplicants();
  }, []);

  const handleReview = async (id: number, action: "approve" | "reject") => {
    setProcessingId(id);
    setMessage(null);

    try {
      await api.patch(`accounts/admin/contractors/${id}/`, { action }, { headers: getAuthHeaders() });

      setApplicants((prev) => prev.filter((applicant) => applicant.id !== id));
      setMessage({
        type: "success",
        text: action === "approve" ? "Contractor approved successfully." : "Contractor rejected successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "The review action could not be completed right now.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenGovernmentId = async (applicant: ContractorApplicant) => {
    const previewWindow = window.open("", "_blank");

    try {
      const response = await api.get(`accounts/admin/contractors/${applicant.id}/government-id/`, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });
      const fileUrl = URL.createObjectURL(response.data);

      if (previewWindow) {
        previewWindow.location.href = fileUrl;
      } else {
        window.open(fileUrl, "_blank", "noreferrer");
      }

      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch (error) {
      previewWindow?.close();
      setMessage({
        type: "error",
        text: `Unable to open ${applicant.first_name || applicant.email}'s government ID.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-4xl bg-linear-to-br from-violet-600 via-fuchsia-600 to-orange-400 p-2 shadow-2xl shadow-violet-900/20">
        <div className="rounded-[1.7rem] bg-white/95 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
                Admin review queue
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Review new contractor applications</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Review each applicant’s profile picture and government ID before approving or rejecting their account.
              </p>
            </div>

            <Link to="/" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
              Back to home
            </Link>
          </div>

          {message ? (
            <div
              className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Loading pending contractors...
            </div>
          ) : null}

          {!loading && applicants.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
              There are no pending contractor applications right now.
            </div>
          ) : null}

          <div className="mt-8 space-y-5">
            {applicants.map((applicant) => {
              const profileUrl = getMediaUrl(applicant.profile_picture);
              const applicantName = `${applicant.first_name} ${applicant.last_name}`.trim() || applicant.email;

              return (
                <div key={applicant.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{applicantName}</h2>
                      <p className="mt-1 text-sm text-slate-500">{applicant.email}</p>
                      <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Pending review
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleReview(applicant.id, "approve")}
                        disabled={processingId === applicant.id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {processingId === applicant.id ? "Working..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(applicant.id, "reject")}
                        disabled={processingId === applicant.id}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {processingId === applicant.id ? "Working..." : "Reject"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">Profile picture</p>
                      {profileUrl ? (
                        <a href={profileUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                          {profileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img
                              src={profileUrl}
                              alt={`${applicantName} profile`}
                              className="h-40 w-full rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-600">
                              Open attachment
                            </div>
                          )}
                        </a>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No profile picture uploaded.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">Government ID</p>
                      {applicant.has_government_id ? (
                        <button
                          type="button"
                          onClick={() => handleOpenGovernmentId(applicant)}
                          className="mt-3 block w-full"
                        >
                          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-600">
                            Open government ID
                          </div>
                        </button>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No government ID uploaded.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
