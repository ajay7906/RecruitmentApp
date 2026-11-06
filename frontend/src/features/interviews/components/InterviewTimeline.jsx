import React from 'react'
import { History } from 'lucide-react'
import { formatInterviewDateTime } from '../schema/interviewSchemas'

export function InterviewTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <p className="text-xs text-slate-400">No interview history recorded yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="relative flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
        >
          <span className="mt-0.5 rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
            <History className="h-3.5 w-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">
                {item.action?.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatInterviewDateTime(item.changedAt)}
              </span>
            </div>

            {item.previousStatus || item.newStatus ? (
              <p className="mt-0.5 text-[11px] text-slate-600">
                Status:{' '}
                {item.previousStatus ? (
                  <>
                    <span className="font-medium">{item.previousStatus}</span> →{' '}
                  </>
                ) : null}
                <span className="font-semibold text-indigo-700">
                  {item.newStatus}
                </span>
              </p>
            ) : null}

            {item.reason ? (
              <p className="mt-1 text-slate-700">{item.reason}</p>
            ) : null}

            {item.previousSchedule?.startTime && item.newSchedule?.startTime ? (
              <p className="mt-1 text-[11px] text-slate-500">
                Previous:{' '}
                {formatInterviewDateTime(
                  item.previousSchedule.startTime,
                  item.previousSchedule.timeZone,
                )}{' '}
                → New:{' '}
                {formatInterviewDateTime(
                  item.newSchedule.startTime,
                  item.newSchedule.timeZone,
                )}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
