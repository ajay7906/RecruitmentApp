import React from 'react'
import { Calendar, Clock, Video, MapPin, Phone, ExternalLink } from 'lucide-react'
import { formatInterviewTimeRange } from '../schema/interviewSchemas'

export function InterviewSchedule({ interview }) {
  if (!interview) return null

  const ModeIcon =
    interview.interviewMode === 'ONLINE'
      ? Video
      : interview.interviewMode === 'IN_PERSON'
      ? MapPin
      : Phone

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          <Calendar className="h-4 w-4" />
          Schedule & Mode ({interview.timeZone || 'Asia/Kolkata'})
        </div>
        {interview.candidateConfirmedAt ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            Candidate Confirmed Attendance
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 h-4 w-4 text-slate-500" />
          <div>
            <p className="text-xs font-medium text-slate-500">Date & Time</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatInterviewTimeRange(
                interview.startTime,
                interview.endTime,
                interview.timeZone,
              )}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <ModeIcon className="mt-0.5 h-4 w-4 text-slate-500" />
          <div>
            <p className="text-xs font-medium text-slate-500">
              Mode: {interview.interviewMode}
            </p>
            {interview.interviewMode === 'ONLINE' && interview.meetingLink ? (
              <a
                href={interview.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"
              >
                Open Video Meeting Link <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : interview.location ? (
              <p className="text-sm font-semibold text-slate-900">
                {interview.location}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Details in instructions below</p>
            )}
          </div>
        </div>
      </div>

      {interview.instructions ? (
        <div className="border-t border-slate-200/80 pt-2.5">
          <p className="text-xs font-semibold text-slate-700">
            Interview Instructions:
          </p>
          <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
            {interview.instructions}
          </p>
        </div>
      ) : null}
    </div>
  )
}
