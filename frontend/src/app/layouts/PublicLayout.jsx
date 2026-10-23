import { Link, Outlet } from "react-router-dom";
import { BriefcaseBusiness } from "lucide-react";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white"><BriefcaseBusiness size={19} /></span>
            Recruitro
          </Link>
          <div className="flex items-center gap-3">
            <Link className="text-sm font-medium text-slate-600 hover:text-slate-900" to="/login">Log in</Link>
            <Link className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" to="/register">Get started</Link>
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
