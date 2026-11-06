import React from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  MessageSquarePlus,
} from 'lucide-react'
import { InterviewStatusBadge } from './InterviewStatusBadge'
import { formatInterviewTimeRange } from '../schema/interviewSchemas'

export function InterviewTable({
  interviews = [],
  onReschedule,
  onCancel,
  onComplete,
}) {
  if (!interviews.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-semibold text-sm text-slate-800">
          No interviews match the selected filters
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Schedule an interview from any candidate application or adjust your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3.5">Candidate</th>
              <th className="px-4 py-3.5">Job & Company</th>
              <th className="px-4 py-3.5">Round & Type</th>
              <th className="px-4 py-3.5">Schedule</th>
              <th className="px-4 py-3.5">Interviewers</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {interviews.map((item) => {
              const canModify = !['COMPLETED', 'CANCELLED'].includes(item.status)
              const hasPendingReschedule = (item.rescheduleRequests || []).some(
                (r) => r.status === 'PENDING',
              )

              return (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900">
                      {item.candidate?.fullName || 'Candidate'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.candidate?.email}
                    </div>
                    {hasPendingReschedule ? (
                      <span className="mt-1 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Reschedule Requested
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-medium text-slate-900">
                      {item.job?.title || '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.company?.name || '—'}
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        R{item.roundNumber}
                      </span>
                      <span className="font-medium text-xs text-slate-800">
                        {item.interviewType}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {item.title} ({item.interviewMode})
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-xs text-slate-700">
                    {formatInterviewTimeRange(
                      item.startTime,
                      item.endTime,
                      item.timeZone,
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(item.interviewers || []).map((a) => (
                        <span
                          key={a.id}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {a.interviewer?.fullName || 'Interviewer'}
                        </span>
                      ))}
                    </div>
                    {item.feedbackSummary?.totalSubmitted > 0 ? (
                      <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                        {item.feedbackSummary.totalSubmitted} feedback(s) • Avg{' '}
                        {item.feedbackSummary.averageOverallRating}/5
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3.5">
                    <InterviewStatusBadge status={item.status} />
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Link
                        to={`/app/recruiter/interviews/${item.id}`}
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                        title="View Interview Details & Feedback"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>

                      {canModify ? (
                        <Link
                          to={`/app/recruiter/interviews/${item.id}/edit`}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit Interview"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      ) : null}

                      {canModify && onReschedule ? (
                        <button
                          type="button"
                          onClick={() => onReschedule(item)}
                          className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                          title="Reschedule Interview"
                        >
                          <CalendarClock className="h-4 w-4" />
                        </button>
                      ) : null}

                      {canModify && onComplete ? (
                        <button
                          type="button"
                          onClick={() => onComplete(item)}
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                          title="Mark Completed"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : null}

                      <Link
                        to={`/app/recruiter/interviews/${item.id}#feedback`}
                        className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-50"
                        title="Submit / View Feedback"
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                      </Link>

                      {canModify && onCancel ? (
                        <button
                          type="button"
                          onClick={() => onCancel(item)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          title="Cancel Interview"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
