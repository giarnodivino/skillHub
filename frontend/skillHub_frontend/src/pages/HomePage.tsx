import { Link } from "react-router-dom";

const hireSteps = [
  {
    title: "Tell us what you need",
    description: "Start with the project, repair, or service you want help with.",
  },
  {
    title: "Browse approved contractors",
    description: "Look through professionals who are active and approved before they appear publicly.",
  },
  {
    title: "Message the right fit",
    description: "Open a conversation, ask questions, and decide who fits the job best.",
  },
];

const serviceIdeas = ["Home repairs", "Cleaning", "Electrical", "Plumbing", "Painting", "Moving help"];

const trustItems = [
  "Contractor accounts go through admin review",
  "Professionals submit a profile photo before activation",
  "Government ID is required for contractor applications",
];

function HomePage() {
  return (
    <div className="space-y-16 pb-12">
      {/* TITLE SECTION */}
      <section>
        <br />
        <div className="text-center p-5">
          <h1 className="text-4xl font-bold">Welcome to NexTask!</h1>
          <p className="mt-2">
            Compare verified contractors, get quotes, and hire the right professional. <strong>all in one place</strong>
          </p>
        </div>
        <div className="buttons flex justify-center gap-4 mt-4">
          <Link
            to="/professionals"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-4xl"
          >
            Find a Professional
          </Link>
          <Link to="/register" className="font-bold hover:bg-amber-100 py-2 px-4 rounded-4xl outline-2">
            Create an Account
          </Link>
        </div>
      </section>

      {/* Hire Cards */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">How hiring works</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">From project idea to professional help</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            NexTask keeps the next step simple whether you are looking for help or applying as a contractor.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {hireSteps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                {index + 1}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl bg-slate-900 p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Popular starting points</p>
          <h2 className="mt-3 text-3xl font-bold">Find help for the jobs people actually need done.</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {serviceIdeas.map((service) => (
              <span key={service} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100">
                {service}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">Why it feels safer</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">Contractor`s are checked before going public.</h2>
          <ul className="mt-6 space-y-3">
            {trustItems.map((item) => (
              <li key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-3xl font-bold text-slate-900">Ready to start?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Browse available professionals now, or create an account so you can manage your profile and messages.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/professionals"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Browse Professionals
            </Link>
            <Link
              to="/register"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              Join NexTask
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
