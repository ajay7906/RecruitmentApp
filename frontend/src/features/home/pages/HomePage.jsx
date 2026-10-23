import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Bot, Users, Target } from "lucide-react";

const benefits = [
  { icon: BriefcaseBusiness, title: "Find the right opportunity", text: "Explore roles and keep your applications organized in one workspace." },
  { icon: Users, title: "A clearer hiring pipeline", text: "Recruiters can organize jobs, candidates, and hiring stages." },
  { icon: Bot, title: "AI-assisted recruitment", text: "A foundation for future resume matching and AI interview workflows." },
];

export function HomePage() {
  return (
    <main>
      <section className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm font-medium text-brand"><Target size={15} /> Recruitment, made more focused</div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Better connections.<br /><span className="text-brand">Better careers.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">A focused workspace for candidates and recruiters to move from discovery to hiring with less friction.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white shadow-soft hover:bg-blue-700">Create an account <ArrowRight size={17} /></Link>
              <Link to="/login" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Sign in</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white bg-white p-5 shadow-soft sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-sm text-slate-500">Your next step</p><h2 className="mt-1 text-xl font-bold text-slate-900">Career workspace</h2></div><div className="rounded-xl bg-blue-50 p-3 text-brand"><BriefcaseBusiness /></div></div>
            <div className="mt-5 space-y-3">
              {["Complete your profile", "Discover relevant jobs", "Track application progress"].map((item, i) => <div key={item} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white font-semibold text-brand shadow-sm">{i + 1}</span><span className="font-medium text-slate-700">{item}</span></div>)}
            </div>
            <p className="mt-5 text-xs text-slate-400">Illustrative product preview · connect real data through your backend</p>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 md:grid-cols-3 lg:px-8">
        {benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand"><Icon size={21} /></div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
      </section>
    </main>
  );
}
