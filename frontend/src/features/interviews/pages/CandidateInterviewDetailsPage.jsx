import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  CalendarClock,
  Users,
  Building2,
} from 'lucide-react'

import { interviewsApi } from '../api/interviewsApi'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Button } from '../../../components/ui/Button'
import { InterviewStatusBadge } from '../components/InterviewStatusBadge'
import { InterviewSchedule } from '../components/InterviewSchedule'
import { InterviewTimeline } from '../components/InterviewTimeline'
import { RescheduleDialog } from '../components/RescheduleDialog'
import { formatInterviewTimeRange } from '../schema/interviewSchemas'

export function CandidateInterviewDetailsPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const query = useQuery({
    queryKey: ['candidate', 'interview-detail', id],
    queryFn: () => interviewsApi.getCandidateInterviewById(id),
  })

  const confirmMutation = useMutation({
    mutationFn: () => interviewsApi.confirmAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['candidate', 'interview-detail', id],
      })
      queryClient.invalidateQueries({ queryKey: ['candidate', 'interviews'] })
      toast.success('Interview attendance confirmed!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not confirm attendance')
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: (payload) => interviewsApi.requestReschedule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['candidate', 'interview-detail', id],
      })
      queryClient.invalidateQueries({ queryKey: ['candidate', 'interviews'] })
      setRescheduleOpen(false)
      toast.success('Reschedule request submitted!')
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || 'Could not submit reschedule request',
      )
    },
  })

  if (query.isPending) {
    return <LoadingState title="Loading interview details..." />
  }

  if (query.isError || !query.data?.interview) {
    return (
      <ErrorState
        title="Could not load interview"
        message={
          query.error?.response?.data?.message ||
          'You do not have access to this interview.'
        }
        onRetry={query.refetch}
      />
    )
  }

  const interview = query.data.interview

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/interviews"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Interviews
        </Link>

        {interview.applicationId ? (
          <Link
            to={`/app/applications/${interview.applicationId}`}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            View My Job Application →
          </Link>
        ) : null}
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                Round {interview.roundNumber}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {interview.interviewType}
              </span>
              <InterviewStatusBadge status={interview.status} />
            </div>

            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              {interview.title}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <Building2 className="h-4 w-4 text-slate-400" />
              <strong>{interview.job?.title}</strong> at{' '}
              <strong>{interview.company?.name}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {interview.canConfirmAttendance ? (
              <Button
                type="button"
                isLoading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
                className="gap-1.5 text-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Attendance
              </Button>
            ) : null}

            {interview.canRequestReschedule ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRescheduleOpen(true)}
                className="gap-1.5 text-xs"
              >
                <CalendarClock className="h-4 w-4" />
                Request Reschedule
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InterviewSchedule interview={interview} />

          {interview.description ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <h2 className="text-base font-bold text-slate-900">
                Interview Overview & Topics
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                {interview.description}
              </p>
            </div>
          ) : null}

          {(interview.rescheduleRequests || []).length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
              <h2 className="text-base font-bold text-slate-900">
                My Reschedule Requests
              </h2>
              {interview.rescheduleRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      Requested:{' '}
                      {formatInterviewTimeRange(
                        req.requestedStartTime,
                        req.requestedEndTime,
                        req.timeZone,
                      )}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">Reason: {req.reason}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Interview Panel
              </h3>
            </div>
            {(interview.interviewers || []).length === 0 ? (
              <p className="text-xs text-slate-500">
                Interviewer details will be shared prior to the session.
              </p>
            ) : (
              <div className="space-y-2">
                {interview.interviewers.map((panelist) => (
                  <div
                    key={panelist.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <p className="font-semibold text-slate-900">
                      {panelist.interviewerName}
                    </p>
                    <p className="text-slate-500">
                      {panelist.designation ||
                        panelist.interviewerRole?.replace(/_/g, ' ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Schedule History
            </h3>
            <InterviewTimeline history={interview.history || []} />
          </div>
        </div>
      </div>

      <RescheduleDialog
        open={rescheduleOpen}
        interview={interview}
        asCandidate
        isPending={rescheduleMutation.isPending}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={(payload) => rescheduleMutation.mutate(payload)}
      />
    </div>
  )
}
