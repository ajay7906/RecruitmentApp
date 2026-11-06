import React from 'react'
import { Star } from 'lucide-react'
import {
  FEEDBACK_RECOMMENDATIONS,
  formatInterviewDateTime,
} from '../schema/interviewSchemas'

export function FeedbackSummary({ feedbacks = [], summary = null }) {
  if (!feedbacks.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
        No interviewer feedback has been submitted for this round yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {summary && summary.totalSubmitted > 0 ? (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-5">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Overall Avg</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-lg font-bold text-slate-900">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              {summary.averageOverallRating ?? '—'}/5
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Technical</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">
              {summary.averageTechnicalRating ?? '—'}/5
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Communication</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">
              {summary.averageCommunicationRating ?? '—'}/5
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Problem Solving</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">
              {summary.averageProblemSolvingRating ?? '—'}/5
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Evaluations</p>
            <p className="mt-0.5 text-sm font-bold text-indigo-700">
              {summary.totalSubmitted} Submitted
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {feedbacks.map((fb) => {
          const recMeta = FEEDBACK_RECOMMENDATIONS.find(
            (r) => r.value === fb.recommendation,
          ) || {
            label: fb.recommendation,
            badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          }

          return (
            <div
              key={fb.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-sm text-slate-900">
                    {fb.interviewer?.fullName || 'Interviewer'}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {formatInterviewDateTime(fb.submittedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    {fb.overallRating}/5
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${recMeta.badgeClass}`}
                  >
                    {recMeta.label}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                {fb.technicalRating ? <span>Tech: {fb.technicalRating}/5</span> : null}
                {fb.communicationRating ? (
                  <span>Comm: {fb.communicationRating}/5</span>
                ) : null}
                {fb.problemSolvingRating ? (
                  <span>Problem Solving: {fb.problemSolvingRating}/5</span>
                ) : null}
                {fb.experienceRating ? (
                  <span>Experience: {fb.experienceRating}/5</span>
                ) : null}
              </div>

              {fb.strengths ? (
                <p className="text-xs text-slate-700">
                  <strong className="text-emerald-700">Strengths: </strong>
                  {fb.strengths}
                </p>
              ) : null}

              {fb.weaknesses ? (
                <p className="text-xs text-slate-700">
                  <strong className="text-rose-700">Concerns: </strong>
                  {fb.weaknesses}
                </p>
              ) : null}

              <p className="whitespace-pre-line text-xs text-slate-600 border-t border-slate-100 pt-2">
                {fb.detailedFeedback}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
