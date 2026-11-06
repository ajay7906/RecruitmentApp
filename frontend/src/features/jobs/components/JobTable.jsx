import { Link } from "react-router-dom";
import { Building2, MapPin, Users2 } from "lucide-react";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobActionMenu } from "./JobActionMenu";
import { formatDate } from "../../../utils/formatters";

export function JobTable({ jobs = [], onAction }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Job Title & Department</th>
              <th className="px-4 py-3.5">Company</th>
              <th className="px-4 py-3.5">Type & Mode</th>
              <th className="px-4 py-3.5">Location</th>
              <th className="px-4 py-3.5">Openings</th>
              <th className="px-4 py-3.5">Dates</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Created By</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => {
              const locationDisplay =
                [job.city, job.state, job.country].filter(Boolean).join(", ") ||
                job.location ||
                job.workMode;

              return (
                <tr key={job.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <Link
                      to={`/app/jobs/${job.id}/manage`}
                      className="font-semibold text-slate-900 hover:text-brand"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {job.department || job.category || "General"}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-brand">
                        {job.company?.logoUrl ? (
                          <img
                            src={job.company.logoUrl}
                            alt={job.company.name}
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <Building2 size={15} />
                        )}
                      </div>
                      <span className="font-medium text-slate-800">
                        {job.company?.name || "—"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-800">
                      {job.employmentType}
                    </p>
                    <p className="text-xs text-slate-500">{job.workMode}</p>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} className="shrink-0 text-slate-400" />
                      {locationDisplay}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <Users2 size={14} className="text-slate-400" />
                      {job.numberOfOpenings}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    <p>
                      <span className="text-slate-400">Pub:</span>{" "}
                      {formatDate(job.publishedAt)}
                    </p>
                    <p className="mt-0.5">
                      <span className="text-slate-400">Due:</span>{" "}
                      {formatDate(job.applicationDeadline)}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <JobStatusBadge status={job.status} size="sm" />
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {job.createdBy?.fullName || "—"}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <JobActionMenu job={job} onAction={onAction} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
