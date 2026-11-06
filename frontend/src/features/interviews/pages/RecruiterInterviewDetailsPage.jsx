import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  XCircle,
  UserX,
  Pencil,
  Award,
  Users,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'

import { interviewsApi } from '../api/interviewsApi'
import { useAuthStore } from '../../../stores/authStore'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Button } from '../../../components/ui/Button'
import { InterviewStatusBadge } from '../components/InterviewStatusBadge'
import { InterviewSchedule } from '../components/InterviewSchedule'
import { InterviewerCard } from '../components/InterviewerCard'
import { InterviewerSelector } from '../components/InterviewerSelector'
import { FeedbackForm } from '../components/FeedbackForm'
import { FeedbackSummary } from '../components/FeedbackSummary'
import { InterviewRoundList } from '../components/InterviewRoundList'
import { InterviewTimeline } from '../components/InterviewTimeline'
import { RescheduleDialog } from '../components/RescheduleDialog'
import { CancelInterviewDialog } from '../components/CancelInterviewDialog'
import { HiringDecisionDialog } from '../components/HiringDecisionDialog'
import { formatInterviewTimeRange } from '../schema/interviewSchemas'

export function RecruiterInterviewDetailsPage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [prefillRescheduleReq, setPrefillRescheduleReq] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [decisionOpen, setDecisionOpen] = useState(false)

  const detailQuery = useQuery({
    queryKey: ['interviews', 'recruiter-detail', id],
    queryFn: () => interviewsApi.getRecruiterInterviewById(id),
  })

  const interview = detailQuery.data?.interview

  const roundsQuery = useQuery({
    queryKey: ['interviews', 'application-rounds', interview?.applicationId],
    queryFn: () => interviewsApi. getHiringDecision(interview.applicationId),
    enabled: Boolean(interview?.applicationId),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['interviews'] })
    queryClient.invalidateQueries({ queryKey: ['applications'] })
  }

  const statusMutation = useMutation({
    mutationFn: (payload) => interviewsApi.completeInterview(id, payload),
    onSuccess: (res) => {
      invalidateAll()
      toast.success(res?.message || 'Interview status updated')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not update status')
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: (payload) => interviewsApi.rescheduleInterview(id, payload),
    onSuccess: () => {
      invalidateAll()
      setRescheduleOpen(false)
      setPrefillRescheduleReq(null)
      toast.success('Interview rescheduled successfully')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not reschedule interview')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (payload) => interviewsApi.cancelInterview(id, payload),
    onSuccess: () => {
      invalidateAll()
      setCancelOpen(false)
      toast.success('Interview cancelled')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not cancel interview')
    },
  })

  const assignMutation = useMutation({
    mutationFn: (interviewers) => interviewsApi.assignInterviewers(id, interviewers),
    onSuccess: () => {
      invalidateAll()
      toast.success('Interviewer assigned')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not assign interviewer')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (assignmentId) => interviewsApi.removeInterviewer(id, assignmentId),
    onSuccess: () => {
      invalidateAll()
      toast.success('Interviewer removed')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not remove interviewer')
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: (payload) => interviewsApi.submitFeedback(id, payload),
    onSuccess: () => {
      invalidateAll()
      toast.success('Interview evaluation feedback saved!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not save feedback')
    },
  })

  const decisionMutation = useMutation({
    mutationFn: (payload) =>
      interviewsApi.makeHiringDecision(interview.applicationId, payload),
    onSuccess: (res) => {
      invalidateAll()
      setDecisionOpen(false)
      toast.success(res?.message || 'Hiring decision recorded')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not record hiring decision')
    },
  })

  if (detailQuery.isPending) {
    return <LoadingState title="Loading interview workspace..." />
  }

  if (detailQuery.isError || !interview) {
    return (
      <ErrorState
        title="Could not load interview"
        message={
          detailQuery.error?.response?.data?.message ||
          'You may not have access to this interview.'
        }
        onRetry={detailQuery.refetch}
      />
    )
  }

  const canManage = Boolean(interview.myCompanyRole)
  const isLocked = ['COMPLETED', 'CANCELLED'].includes(interview.status)
  const myFeedback = (interview.feedbacks || []).find(
    (f) => f.interviewerId === user?.id,
  )
  const pendingRequests = (interview.rescheduleRequests || []).filter(
    (r) => r.status === 'PENDING',
  )
  const allRounds = roundsQuery.data?.interviewRounds || [interview]

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/recruiter/interviews"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Interview Management
        </Link>

        <div className="flex items-center gap-3">
          {interview.applicationId ? (
            <Link
              to={`/app/recruiter/applications/${interview.applicationId}`}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              View Full Application & Resume →
            </Link>
          ) : null}
        </div>
      </div>

      {/* Hero Header */}
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
            <p className="mt-1 text-sm text-slate-600">
              Candidate:{' '}
              <strong className="text-slate-900">
                {interview.candidate?.fullName}
              </strong>{' '}
              ({interview.candidate?.email}) • Job:{' '}
              <strong className="text-slate-900">{interview.job?.title}</strong>{' '}
              at <strong>{interview.company?.name}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isLocked ? (
              <>
                <Button
                  type="button"
                  onClick={() =>
                    statusMutation.mutate({
                      status: 'COMPLETED',
                      reason: 'Round completed',
                    })
                  }
                  isLoading={statusMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Completed
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    statusMutation.mutate({
                      status: 'NO_SHOW',
                      noShowParty: 'CANDIDATE',
                      reason: 'Candidate did not attend scheduled slot',
                    })
                  }
                  className="gap-1.5 text-xs"
                >
                  <UserX className="h-3.5 w-3.5" />
                  Mark No-Show
                </Button>

                {canManage ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setPrefillRescheduleReq(null)
                        setRescheduleOpen(true)
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Reschedule
                    </Button>

                    <Link to={`/app/recruiter/interviews/${interview.id}/edit`}>
                      <Button variant="secondary" className="gap-1.5 text-xs">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setCancelOpen(true)}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </>
                ) : null}
              </>
            ) : null}

            {canManage ? (
              <Button
                type="button"
                onClick={() => setDecisionOpen(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                <Award className="h-3.5 w-3.5" />
                Make Hiring Decision
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Pending Candidate Reschedule Request Alert */}
      {pendingRequests.length > 0 && canManage ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-950">
                    Candidate Requested Reschedule
                  </p>
                  <p className="text-xs text-amber-900">
                    Preferred Slot:{' '}
                    <strong>
                      {formatInterviewTimeRange(
                        req.requestedStartTime,
                        req.requestedEndTime,
                        req.timeZone,
                      )}
                    </strong>
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Reason: &ldquo;{req.reason}&rdquo;
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setPrefillRescheduleReq(req)
                  setRescheduleOpen(true)
                }}
                className="py-1.5 text-xs"
              >
                Review & Approve Reschedule
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Schedule & Meeting Info */}
          <InterviewSchedule interview={interview} />

          {/* Evaluation & Feedback Section */}
          <div
            id="feedback"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Interviewer Evaluations & Feedback
                </h2>
                <p className="text-xs text-slate-500">
                  Confidential ratings and hiring recommendations for Round{' '}
                  {interview.roundNumber}.
                </p>
              </div>
            </div>

            {interview.status !== 'CANCELLED' && interview.status !== 'DRAFT' ? (
              <FeedbackForm
                initialFeedback={myFeedback}
                isSubmitting={feedbackMutation.isPending}
                onSubmit={async (payload) => {
                  await feedbackMutation.mutateAsync(payload)
                }}
              />
            ) : null}

            <FeedbackSummary
              feedbacks={interview.feedbacks || []}
              summary={interview.feedbackSummary}
            />
          </div>

          {/* All Interview Rounds for this Application */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <InterviewRoundList
              rounds={allRounds}
              applicationId={interview.applicationId}
              canManage={canManage}
            />
          </div>
        </div>

        {/* Right Column: Assigned Interviewers & Audit Timeline */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Assigned Interviewers ({(interview.interviewers || []).length})
              </h3>
            </div>

            {canManage && !isLocked ? (
              <InterviewerSelector
                eligibleMembers={interview.company?.eligibleMembers || []}
                selectedInterviewers={interview.interviewers || []}
                isSaving={assignMutation.isPending}
                onSaveDirect={(list) => assignMutation.mutate(list)}
              />
            ) : null}

            <div className="space-y-2">
              {(interview.interviewers || []).map((a) => (
                <InterviewerCard
                  key={a.id}
                  assignment={a}
                  canRemove={canManage && !isLocked}
                  onRemove={(assignmentId) => removeMutation.mutate(assignmentId)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Interview Audit Trail & Schedule History
            </h3>
            <InterviewTimeline history={interview.history || []} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <RescheduleDialog
        open={rescheduleOpen}
        interview={interview}
        prefillRequest={prefillRescheduleReq}
        isPending={rescheduleMutation.isPending}
        onClose={() => {
          setRescheduleOpen(false)
          setPrefillRescheduleReq(null)
        }}
        onConfirm={(payload) => rescheduleMutation.mutate(payload)}
      />

      <CancelInterviewDialog
        open={cancelOpen}
        interview={interview}
        isPending={cancelMutation.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={(payload) => cancelMutation.mutate(payload)}
      />

      <HiringDecisionDialog
        open={decisionOpen}
        candidateName={interview.candidate?.fullName}
        jobTitle={interview.job?.title}
        currentApplicationStatus={interview.application?.status}
        isPending={decisionMutation.isPending}
        onClose={() => setDecisionOpen(false)}
        onConfirm={(payload) => decisionMutation.mutate(payload)}
      />
    </div>
  )
}
