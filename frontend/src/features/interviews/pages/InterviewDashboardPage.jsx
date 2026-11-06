import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Calendar,
  List,
  Award,
} from 'lucide-react'

import { interviewsApi } from '../api/interviewsApi'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Button } from '../../../components/ui/Button'
import { InterviewStatistics } from '../components/InterviewStatistics'
import { InterviewFilters } from '../components/InterviewFilters'
import { InterviewTable } from '../components/InterviewTable'
import { InterviewCalendar } from '../components/InterviewCalendar'
import { RescheduleDialog } from '../components/RescheduleDialog'
import { CancelInterviewDialog } from '../components/CancelInterviewDialog'

const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  interviewType: '',
  timeframe: 'ALL',
  dateFrom: '',
  companyId: '',
  jobId: '',
}

export function InterviewDashboardPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [viewMode, setViewMode] = useState('table')
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  const statsQuery = useQuery({
    queryKey: ['interviews', 'recruiter-stats'],
    queryFn: () => interviewsApi.getRecruiterInterviewStats(),
  })

  const listQuery = useQuery({
    queryKey: ['interviews', 'recruiter-list', filters],
    queryFn: () => interviewsApi.listRecruiterInterviews(filters),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['interviews'] })
    queryClient.invalidateQueries({ queryKey: ['applications'] })
  }

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, payload }) => interviewsApi.rescheduleInterview(id, payload),
    onSuccess: () => {
      invalidateAll()
      setRescheduleTarget(null)
      toast.success('Interview rescheduled successfully')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not reschedule interview')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, payload }) => interviewsApi.cancelInterview(id, payload),
    onSuccess: () => {
      invalidateAll()
      setCancelTarget(null)
      toast.success('Interview cancelled')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not cancel interview')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (id) =>
      interviewsApi.completeInterview(id, {
        status: 'COMPLETED',
        reason: 'Marked completed from Interview Dashboard',
      }),
    onSuccess: () => {
      invalidateAll()
      toast.success('Interview marked as completed')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not complete interview')
    },
  })

  if (listQuery.isPending && statsQuery.isPending) {
    return <LoadingState title="Loading interview management dashboard..." />
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        title="Could not load interviews"
        message={
          listQuery.error?.response?.data?.message ||
          'Unable to fetch interview schedules.'
        }
        onRetry={listQuery.refetch}
      />
    )
  }

  const stats = statsQuery.data?.stats || {}
  const interviews = listQuery.data?.interviews || []
  const pagination = listQuery.data?.pagination || { page: 1, totalPages: 1, total: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            INTERVIEW & HIRING PIPELINE
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Interview Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Schedule multi-round interviews, assign interviewers, collect evaluations, and make final hiring decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </button>
          </div>

          <Link to="/app/recruiter/hiring">
            <Button variant="secondary" className="gap-1.5">
              <Award className="h-4 w-4" />
              Hiring Decisions
            </Button>
          </Link>

          <Link to="/app/recruiter/interviews/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Schedule Interview
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Statistics */}
      <InterviewStatistics
        stats={stats}
        activeTimeframe={filters.timeframe}
        onSelectTimeframe={(tf) =>
          setFilters((prev) => ({ ...prev, timeframe: tf, page: 1 }))
        }
      />

      {/* Search & Filters */}
      <InterviewFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Main View */}
      {viewMode === 'calendar' ? (
        <InterviewCalendar interviews={interviews} />
      ) : (
        <InterviewTable
          interviews={interviews}
          onReschedule={(item) => setRescheduleTarget(item)}
          onCancel={(item) => setCancelTarget(item)}
          onComplete={(item) => completeMutation.mutate(item.id)}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <span>
            Showing page <strong>{pagination.page}</strong> of{' '}
            <strong>{pagination.totalPages}</strong> ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pagination.page <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
              }
              className="py-1.5 text-xs"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              className="py-1.5 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {/* Dialogs */}
      <RescheduleDialog
        open={Boolean(rescheduleTarget)}
        interview={rescheduleTarget}
        isPending={rescheduleMutation.isPending}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={(payload) =>
          rescheduleMutation.mutate({ id: rescheduleTarget.id, payload })
        }
      />

      <CancelInterviewDialog
        open={Boolean(cancelTarget)}
        interview={cancelTarget}
        isPending={cancelMutation.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={(payload) =>
          cancelMutation.mutate({ id: cancelTarget.id, payload })
        }
      />
    </div>
  )
}
