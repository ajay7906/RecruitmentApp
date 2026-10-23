import { Link } from "react-router-dom";

export function NotFoundPage() {
  return <main className="grid min-h-screen place-items-center bg-canvas px-5"><div className="text-center"><p className="text-sm font-bold tracking-widest text-brand">404</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Page not found</h1><p className="mt-3 text-slate-500">The page may have moved or the URL is incorrect.</p><Link to="/" className="mt-6 inline-flex rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">Back home</Link></div></main>;
}
