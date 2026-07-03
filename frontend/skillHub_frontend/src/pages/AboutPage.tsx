import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

type Contractor = {
  id: number;
  services?: string;
};

function getServiceList(contractors: Contractor[]) {
  const services = contractors.flatMap(
    (contractor) =>
      contractor.services
        ?.split(/[\n,]+/)
        .map((service) => service.trim())
        .filter(Boolean) ?? [],
  );

  return Array.from(new Set(services)).sort((firstService, secondService) => firstService.localeCompare(secondService));
}

function AboutPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");

  useEffect(() => {
    const loadAvailableServices = async () => {
      try {
        setIsLoadingServices(true);
        setServicesError("");
        const response = await api.get<Contractor[]>("accounts/contractors/");
        setContractors(response.data);
      } catch {
        setServicesError("Available services could not be loaded right now.");
      } finally {
        setIsLoadingServices(false);
      }
    };

    void loadAvailableServices();
  }, []);

  const availableServices = useMemo(() => getServiceList(contractors), [contractors]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 pt-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">About NexTask</p>
        <h1 className="mt-4 text-4xl font-bold text-slate-900">Why NexTask exists</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">
          NexTask was created because finding household help in the Philippines can feel messy and frustrating. When
          someone needs help with a broken aircon, electrical issue, cleaning, or other home service, the search often
          starts in Facebook groups, comment sections, or random recommendations.
        </p>
        <p className="mt-4 text-lg leading-8 text-slate-700">
          That works sometimes, but it can also be cluttered. People have to scroll through old posts, ask if a
          contractor is still available, compare scattered comments, and hope they are choosing the right person.
        </p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="text-2xl font-bold text-slate-900">The Problem</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Household services are hard to find when everything is mixed into social media feeds. Customers need a
            clearer way to discover contractors, and contractors need a better place to show what they can do.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-2xl font-bold text-slate-900">The Solution</h2>
          <p className="mt-3 leading-7 text-slate-700">
            NexTask centralizes household contractors in one place, so people can browse services, view professionals,
            and start conversations without relying on cluttered posts.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Services Available</h2>
        {isLoadingServices ? (
          <p className="mt-4 text-slate-600">Loading services from active contractors...</p>
        ) : servicesError ? (
          <p className="mt-4 text-red-600">{servicesError}</p>
        ) : availableServices.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {availableServices.map((service) => (
              <span key={service} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {service}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-600">No services are listed by active contractors yet.</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-slate-900 p-6 text-white">
        <h2 className="text-2xl font-bold">The goal is simple</h2>
        <p className="mt-3 leading-7 text-slate-300">
          Give customers a more organized way to find household help, and give contractors a dedicated space to post and
          promote their services.
        </p>
      </section>
    </div>
  );
}

export default AboutPage;
