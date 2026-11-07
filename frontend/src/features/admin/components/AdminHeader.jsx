import { Menu } from "lucide-react";
import { AdminRoleBadge } from "./UserStatusBadge";

export function AdminHeader({ user, onOpenMobileMenu }) {
  const displayName = user?.fullName || user?.name || "Administrator";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Central Administration Console
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <AdminRoleBadge role={user?.adminRole || "ADMIN"} />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-900">{displayName}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
