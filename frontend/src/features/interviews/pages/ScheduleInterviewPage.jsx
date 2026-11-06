import React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

import { interviewsApi } from '../api/interviewsApi'
import { applicationsApi } from '../../applications/api/applicationsApi'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { InterviewForm } from '../components/InterviewForm'

export function ScheduleInterviewPage() {
  const [searchParams] = useSearchParams()
  const preselectedApplicationId = searchParams.get('applicationId') || ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const appsQuery = useQuery({
    queryKey: ['applications', 'recruiter-eligible-for-interview'],
    queryFn: () => applicationsApi.listRecruiterApplications({ limit: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: interviewsApi.createInterview,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success(res?.message || 'Interview scheduled successfully!')
      const createdId = res?.interview?.id
      if (createdId) {
        navigate(`/app/recruiter/interviews/${createdId}`)
      } else {
        navigate('/app/recruiter/interviews')
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to schedule interview')
    },
  })

  if (appsQuery.isPending) {
    return <LoadingState title="Loading eligible candidate applications..." />
  }

  const allApps =
    appsQuery.data?.data?.applications || appsQuery.data?.applications || []
  const eligibleApps = allApps.filter((a) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW'].includes(a.status),
  )

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/app/recruiter/interviews"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Interview Management
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Schedule Interview Round
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure round details, schedule date & time with timezone, and assign interviewers.
        </p>
      </div>

      <InterviewForm
        applications={eligibleApps}
        selectedApplicationId={preselectedApplicationId}
        isSubmitting={createMutation.isPending}
        onCancel={() => navigate(-1)}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload)
        }}
      />
    </div>
  )
}
