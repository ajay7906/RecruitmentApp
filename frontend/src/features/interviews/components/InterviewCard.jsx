import React from 'react'
import { Link } from 'react-router-dom'
import {
  Video,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react'
import { InterviewStatusBadge } from './InterviewStatusBadge'
import { formatInterviewTimeRange } from '../schema/interviewSchemas'
import { Button } from '../../../components/ui/Button'

export function InterviewCard({
  interview,
  asCandidate = false,
  onConfirmAttendance,
  onRequestReschedule,
  isMutating = false,
}) {
  if (!interview) return null

  const ModeIcon =
    interview.interviewMode === 'ONLINE'
      ? Video
      : interview.interviewMode === 'IN_PERSON'
      ? MapPin
      : Phone

  const detailsUrl = asCandidate
    ? `/app/interviews/${interview.id}`
    : `/app/recruiter/interviews/${interview.id}`

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
              Round {interview.roundNumber}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {interview.interviewType}
            </span>
            <InterviewStatusBadge status={interview.status} />
          </div>
          <h3 className="mt-1.5 text-base font-bold text-slate-900">
            {interview.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {interview.job?.title || 'Job Opening'} •{' '}
            <span className="font-semibold text-slate-800">
              {interview.company?.name || 'Company'}
            </span>
            {!asCandidate && interview.candidate?.fullName ? (
              <>
                {' '}
                • Candidate:{' '}
                <span className="font-semibold text-indigo-600">
                  {interview.candidate.fullName}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <Link to={detailsUrl}>
          <Button variant="secondary" className="py-1.5 text-xs">
            View Details →
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
          <Clock className="h-3.5 w-3.5 text-indigo-600" />
          {formatInterviewTimeRange(
            interview.startTime,
            interview.endTime,
            interview.timeZone,
          )}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <ModeIcon className="h-3.5 w-3.5 text-slate-400" />
          {interview.interviewMode}
        </span>

        {interview.interviewMode === 'ONLINE' && interview.meetingLink ? (
          <a
            href={interview.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
          >
            Join Meeting <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}

        {interview.interviewMode === 'IN_PERSON' && interview.location ? (
          <span className="text-slate-600 truncate max-w-xs">
            Location: {interview.location}
          </span>
        ) : null}
      </div>

      {asCandidate &&
      (interview.canConfirmAttendance || interview.canRequestReschedule) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {interview.canConfirmAttendance && onConfirmAttendance ? (
            <Button
              type="button"
              disabled={isMutating}
              onClick={() => onConfirmAttendance(interview.id)}
              className="gap-1.5 py-1.5 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Attendance
            </Button>
          ) : null}

          {interview.canRequestReschedule && onRequestReschedule ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isMutating}
              onClick={() => onRequestReschedule(interview)}
              className="gap-1.5 py-1.5 text-xs"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Request Reschedule
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
