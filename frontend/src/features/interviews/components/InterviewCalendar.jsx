import React from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Video, MapPin, Phone } from 'lucide-react'
import { InterviewStatusBadge } from './InterviewStatusBadge'

export function InterviewCalendar({ interviews = [], asCandidate = false }) {
  if (!interviews.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">
          No scheduled interviews to display on calendar
        </p>
      </div>
    )
  }

  // Group interviews by date string (YYYY-MM-DD in interview timezone)
  const grouped = interviews.reduce((acc, item) => {
    const dayKey = new Date(item.startTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: item.timeZone || 'Asia/Kolkata',
    })
    if (!acc[dayKey]) acc[dayKey] = []
    acc[dayKey].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dayLabel, dayInterviews]) => (
        <div
          key={dayLabel}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
        >
          <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <CalendarDays className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">{dayLabel}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {dayInterviews.length} interview{dayInterviews.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {dayInterviews.map((item) => {
              const ModeIcon =
                item.interviewMode === 'ONLINE'
                  ? Video
                  : item.interviewMode === 'IN_PERSON'
                  ? MapPin
                  : Phone
              const linkTo = asCandidate
                ? `/app/interviews/${item.id}`
                : `/app/recruiter/interviews/${item.id}`

              return (
                <Link
                  key={item.id}
                  to={linkTo}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-indigo-300 hover:bg-white"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                        Round {item.roundNumber}
                      </span>
                      <InterviewStatusBadge status={item.status} />
                    </div>
                    <h4 className="mt-2 font-semibold text-sm text-slate-900">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {asCandidate
                        ? `${item.job?.title} • ${item.company?.name}`
                        : `${item.candidate?.fullName} • ${item.job?.title}`}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      {new Date(item.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ModeIcon className="h-3.5 w-3.5" />
                      {item.interviewMode}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
