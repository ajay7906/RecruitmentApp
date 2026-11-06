import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Users } from 'lucide-react'

import { interviewsApi } from '../api/interviewsApi'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { InterviewForm } from '../components/InterviewForm'
import { InterviewerCard } from '../components/InterviewerCard'
import { InterviewerSelector } from '../components/InterviewerSelector'

export function EditInterviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['interviews', 'recruiter-detail', id],
    queryFn: () => interviewsApi.getRecruiterInterviewById(id),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['interviews'] })
  }

  const updateMutation = useMutation({
    mutationFn: (payload) => interviewsApi.updateInterview(id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Interview updated successfully!')
      navigate(`/app/recruiter/interviews/${id}`)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update interview')
    },
  })

  const assignMutation = useMutation({
    mutationFn: (interviewers) => interviewsApi.assignInterviewers(id, interviewers),
    onSuccess: () => {
      invalidate()
      toast.success('Interviewer assigned')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to assign interviewer')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (assignmentId) => interviewsApi.removeInterviewer(id, assignmentId),
    onSuccess: () => {
      invalidate()
      toast.success('Interviewer removed')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to remove interviewer')
    },
  })

  if (query.isPending) return <LoadingState title="Loading interview details..." />
  if (query.isError)
    return (
      <ErrorState
        title="Could not load interview"
        message={query.error?.response?.data?.message || 'Unable to load interview'}
        onRetry={query.refetch}
      />
    )

  const interview = query.data?.interview
  const eligibleMembers = interview?.company?.eligibleMembers || []

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/app/recruiter/interviews/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Interview Details
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Edit Interview: {interview?.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Candidate: <strong>{interview?.candidate?.fullName}</strong> • Job:{' '}
          <strong>{interview?.job?.title}</strong>
        </p>
      </div>

      <InterviewForm
        initialData={interview}
        isSubmitting={updateMutation.isPending}
        onCancel={() => navigate(`/app/recruiter/interviews/${id}`)}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync(payload)
        }}
      />

      {/* Interviewer Assignment Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Assigned Interviewers ({(interview?.interviewers || []).length})
            </h2>
            <p className="text-xs text-slate-500">
              Assign or remove company interviewers for this round.
            </p>
          </div>
        </div>

        <InterviewerSelector
          eligibleMembers={eligibleMembers}
          selectedInterviewers={interview?.interviewers || []}
          isSaving={assignMutation.isPending}
          onSaveDirect={(list) => assignMutation.mutate(list)}
        />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(interview?.interviewers || []).map((a) => (
            <InterviewerCard
              key={a.id}
              assignment={a}
              canRemove={!['COMPLETED', 'CANCELLED'].includes(interview.status)}
              onRemove={(assignmentId) => removeMutation.mutate(assignmentId)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
