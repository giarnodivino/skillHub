import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

type Contractor = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: "contractor";
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

function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Contractor[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [professionals, query]);

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
          {filteredProfessionals.map((professional) => (
            <article
              key={professional.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-lg font-semibold text-sky-700">
                    {getInitials(professional.name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{professional.name}</h2>
                    <p className="text-sm text-slate-600">{professional.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Contractor
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
                <span>Remote or local</span>
                <span>•</span>
                <span>New</span>
                <span>•</span>
                <span>Contact for rates</span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {professional.name} is registered as a contractor on SkillHub and available to connect with customers.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  General contractor
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  SkillHub member
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  View profile
                </button>
                <span className="text-sm font-medium text-sky-600">Available for hire</span>
              </div>
            </article>
          ))}
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
