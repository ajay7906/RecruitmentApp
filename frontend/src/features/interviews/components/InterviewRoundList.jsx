import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Star } from 'lucide-react'
import { InterviewStatusBadge } from './InterviewStatusBadge'
import { formatInterviewTimeRange } from '../schema/interviewSchemas'
import { Button } from '../../../components/ui/Button'

export function InterviewRoundList({
  rounds = [],
  applicationId,
  canManage = false,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm text-slate-900">
            Interview Rounds ({rounds.length})
          </h3>
          <p className="text-xs text-slate-500">
            Ordered multi-round interview progression for this application.
          </p>
        </div>

        {canManage && applicationId ? (
          <Link to={`/app/recruiter/interviews/new?applicationId=${applicationId}`}>
            <Button type="button" className="gap-1.5 py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Schedule Next Round
            </Button>
          </Link>
        ) : null}
      </div>

      {rounds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
          No interview rounds scheduled for this application yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {rounds.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                    Round {r.roundNumber}
                  </span>
                  <span className="font-semibold text-sm text-slate-900">
                    {r.title}
                  </span>
                  <span className="text-xs text-slate-500">({r.interviewType})</span>
                  <InterviewStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatInterviewTimeRange(r.startTime, r.endTime, r.timeZone)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {r.feedbackSummary?.totalSubmitted > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    {r.feedbackSummary.averageOverallRating}/5 (
                    {r.feedbackSummary.totalSubmitted})
                  </span>
                ) : null}

                <Link to={`/app/recruiter/interviews/${r.id}`}>
                  <Button variant="secondary" className="py-1.5 text-xs">
                    Manage Round →
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
