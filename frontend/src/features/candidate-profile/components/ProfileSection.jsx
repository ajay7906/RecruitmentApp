
export function ProfileSection({
  title,
  description,
  icon: Icon,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:p-6">
        {Icon && (
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <Icon size={20} />
          </div>
        )}

        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        {children}
      </div>
    </section>
  );
}
