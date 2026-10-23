import { BriefcaseBusiness, FileCheck2, UserRound, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";

const cards = [
  { label: "Profile", value: "Keep it current", icon: UserRound, to: "/app/profile", note: "Help employers understand your experience." },
  { label: "Explore jobs", value: "Find your next step", icon: BriefcaseBusiness, to: "/app/jobs", note: "Review opportunities that fit your goals." },
  { label: "Applications", value: "Track your progress", icon: FileCheck2, to: "/app/applications", note: "Keep your job search organized." },
];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-brand">YOUR WORKSPACE</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : " back"}</h1>
        <p className="mt-2 text-slate-500">Here are the next steps in your recruitment journey.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, to, note }) => <Link key={label} to={to} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand"><Icon size={21} /></span><ArrowUpRight className="text-slate-300 transition group-hover:text-brand" size={19} /></div>
          <p className="mt-6 text-sm font-medium text-slate-500">{label}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{value}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
        </Link>)}
      </div>
      <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Backend integration checkpoint</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">This dashboard currently uses starter content. Once your API endpoints are connected, replace these cards with real profile completion, job, and application data.</p>
      </div>
    </div>
  );
}
