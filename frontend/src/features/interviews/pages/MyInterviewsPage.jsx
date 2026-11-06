import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Calendar, List } from 'lucide-react'

import { interviewsApi } from '../api/interviewsApi'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { InterviewCard } from '../components/InterviewCard'
import { InterviewCalendar } from '../components/InterviewCalendar'
import { RescheduleDialog } from '../components/RescheduleDialog'

export function MyInterviewsPage() {
  const queryClient = useQueryClient()
  const [timeframe, setTimeframe] = useState('ALL')
  const [viewMode, setViewMode] = useState('list')
  const [rescheduleTarget, setRescheduleTarget] = useState(null)

  const query = useQuery({
    queryKey: ['candidate', 'interviews', timeframe],
    queryFn: () =>
      interviewsApi.listCandidateInterviews({
        timeframe: timeframe === 'ALL' ? undefined : timeframe,
        limit: 50,
      }),
  })

  const confirmMutation = useMutation({
    mutationFn: interviewsApi.confirmAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', 'interviews'] })
      toast.success('Interview attendance confirmed!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not confirm attendance')
    },
  })

  const rescheduleReqMutation = useMutation({
    mutationFn: ({ id, payload }) => interviewsApi.requestReschedule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', 'interviews'] })
      setRescheduleTarget(null)
      toast.success('Reschedule request sent to the hiring team!')
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || 'Could not submit reschedule request',
      )
    },
  })

  if (query.isPending) {
    return <LoadingState title="Loading your scheduled interviews..." />
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load interviews"
        message={
          query.error?.response?.data?.message ||
          'Unable to load your interview schedule.'
        }
        onRetry={query.refetch}
      />
    )
  }

  const interviews = query.data?.interviews || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            INTERVIEW SCHEDULE
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            My Interviews
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your upcoming interview rounds, join video meetings, confirm attendance, or request rescheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'UPCOMING', 'PAST'].map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                timeframe === tf
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tf === 'ALL'
                ? 'All Interviews'
                : tf === 'UPCOMING'
                ? 'Upcoming'
                : 'Past & Completed'}
            </button>
          ))}

          <div className="ml-2 inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-1.5 ${
                viewMode === 'list' ? 'bg-slate-100 text-indigo-600' : 'text-slate-500'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`rounded-lg p-1.5 ${
                viewMode === 'calendar'
                  ? 'bg-slate-100 text-indigo-600'
                  : 'text-slate-500'
              }`}
              title="Calendar View"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-semibold text-base text-slate-800">
            No scheduled interviews yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            When an employer schedules an interview for one of your applications, it will appear here.
          </p>
        </div>
      ) : viewMode === 'calendar' ? (
        <InterviewCalendar interviews={interviews} asCandidate />
      ) : (
        <div className="space-y-4">
          {interviews.map((item) => (
            <InterviewCard
              key={item.id}
              interview={item}
              asCandidate
              isMutating={
                confirmMutation.isPending || rescheduleReqMutation.isPending
              }
              onConfirmAttendance={(id) => confirmMutation.mutate(id)}
              onRequestReschedule={(interviewObj) =>
                setRescheduleTarget(interviewObj)
              }
            />
          ))}
        </div>
      )}

      <RescheduleDialog
        open={Boolean(rescheduleTarget)}
        interview={rescheduleTarget}
        asCandidate
        isPending={rescheduleReqMutation.isPending}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={(payload) =>
          rescheduleReqMutation.mutate({ id: rescheduleTarget.id, payload })
        }
      />
    </div>
  )
}
