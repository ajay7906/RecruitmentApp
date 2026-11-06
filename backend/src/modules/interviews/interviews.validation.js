const { z } = require('zod');

const INTERVIEW_TYPES = [
  'Technical Interview',
  'HR Interview',
  'Managerial Interview',
  'Coding Assessment',
  'System Design Interview',
  'Behavioral Interview',
  'Final Interview',
  'Other',
];

const INTERVIEW_MODES = ['ONLINE', 'IN_PERSON', 'TELEPHONIC'];

const INTERVIEW_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'RESCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

const INTERVIEWER_ROLES = [
  'PRIMARY_INTERVIEWER',
  'TECHNICAL_INTERVIEWER',
  'HR_INTERVIEWER',
  'OBSERVER',
];

const FEEDBACK_RECOMMENDATIONS = ['STRONG_HIRE', 'HIRE', 'HOLD', 'REJECT'];

const HIRING_DECISIONS = ['SELECTED', 'REJECTED', 'ON_HOLD'];

const idParamSchema = z.object({
  id: z.string().uuid('Valid ID is required'),
});

const interviewerAssignmentInputSchema = z.object({
  interviewerId: z.string().uuid('Valid interviewer user ID is required'),
  interviewerRole: z.enum(INTERVIEWER_ROLES).default('TECHNICAL_INTERVIEWER'),
});

const createInterviewBodySchema = z
  .object({
    applicationId: z.string().uuid('Valid application ID is required'),
    title: z.string().trim().min(2, 'Interview title is required').max(160),
    roundNumber: z.coerce.number().int().min(1).max(20).optional(),
    interviewType: z.enum(INTERVIEW_TYPES),
    interviewMode: z.enum(INTERVIEW_MODES).default('ONLINE'),
    interviewDate: z.string().min(1, 'Interview date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    timeZone: z.string().trim().min(1).max(80).default('Asia/Kolkata'),
    location: z.string().trim().max(500).nullable().optional(),
    meetingLink: z
      .string()
      .trim()
      .url('Valid meeting URL is required')
      .max(500)
      .nullable()
      .optional()
      .or(z.literal('')),
    description: z.string().trim().max(4000).nullable().optional(),
    instructions: z.string().trim().max(4000).nullable().optional(),
    allowCandidateReschedule: z.boolean().default(true),
    status: z.enum(['DRAFT', 'SCHEDULED']).default('SCHEDULED'),
    interviewers: z.array(interviewerAssignmentInputSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'Invalid start time format',
      });
    }
    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'Invalid end time format',
      });
    }
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be after start time',
      });
    }
    if (
      data.status === 'SCHEDULED' &&
      data.interviewMode === 'ONLINE' &&
      (!data.meetingLink || !data.meetingLink.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meetingLink'],
        message: 'Meeting link is required for scheduled online interviews',
      });
    }
    if (
      data.status === 'SCHEDULED' &&
      data.interviewMode === 'IN_PERSON' &&
      (!data.location || !data.location.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'Location / address is required for scheduled in-person interviews',
      });
    }
  });

const updateInterviewBodySchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    roundNumber: z.coerce.number().int().min(1).max(20).optional(),
    interviewType: z.enum(INTERVIEW_TYPES).optional(),
    interviewMode: z.enum(INTERVIEW_MODES).optional(),
    interviewDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    timeZone: z.string().trim().min(1).max(80).optional(),
    location: z.string().trim().max(500).nullable().optional(),
    meetingLink: z
      .string()
      .trim()
      .url('Valid meeting URL is required')
      .max(500)
      .nullable()
      .optional()
      .or(z.literal('')),
    description: z.string().trim().max(4000).nullable().optional(),
    instructions: z.string().trim().max(4000).nullable().optional(),
    allowCandidateReschedule: z.boolean().optional(),
    status: z.enum(INTERVIEW_STATUSES).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime) {
      const s = new Date(data.startTime);
      const e = new Date(data.endTime);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e <= s) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endTime'],
          message: 'End time must be after start time',
        });
      }
    }
  });

const rescheduleInterviewBodySchema = z
  .object({
    interviewDate: z.string().min(1, 'New interview date is required'),
    startTime: z.string().min(1, 'New start time is required'),
    endTime: z.string().min(1, 'New end time is required'),
    timeZone: z.string().trim().min(1).max(80).optional(),
    location: z.string().trim().max(500).nullable().optional(),
    meetingLink: z.string().trim().url().max(500).nullable().optional().or(z.literal('')),
    reason: z.string().trim().min(3, 'Reschedule reason is required').max(1000),
    rescheduleRequestId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const s = new Date(data.startTime);
    const e = new Date(data.endTime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be after start time',
      });
    }
  });

const cancelInterviewBodySchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason is required').max(1000),
  cancellationType: z
    .enum([
      'RECRUITER_CANCELLED',
      'CANDIDATE_REQUESTED',
      'INTERVIEWER_UNAVAILABLE',
      'POSITION_CLOSED',
      'OTHER',
    ])
    .default('RECRUITER_CANCELLED'),
});

const completeInterviewBodySchema = z.object({
  status: z.enum(['COMPLETED', 'NO_SHOW', 'IN_PROGRESS', 'CONFIRMED']).default('COMPLETED'),
  noShowParty: z.enum(['CANDIDATE', 'INTERVIEWER']).nullable().optional(),
  reason: z.string().trim().max(1000).nullable().optional(),
  nextAction: z.enum(['NONE', 'REJECT_CANDIDATE', 'SHORTLIST_NEXT_ROUND']).default('NONE'),
});

const assignInterviewersBodySchema = z.object({
  interviewers: z
    .array(interviewerAssignmentInputSchema)
    .min(1, 'At least one interviewer is required'),
});

const ratingField = z.coerce.number().int().min(1).max(5);

const submitFeedbackBodySchema = z.object({
  overallRating: ratingField,
  technicalRating: ratingField.nullable().optional(),
  communicationRating: ratingField.nullable().optional(),
  problemSolvingRating: ratingField.nullable().optional(),
  experienceRating: ratingField.nullable().optional(),
  strengths: z.string().trim().max(3000).nullable().optional(),
  weaknesses: z.string().trim().max(3000).nullable().optional(),
  detailedFeedback: z.string().trim().min(5, 'Detailed feedback is required').max(6000),
  recommendation: z.enum(FEEDBACK_RECOMMENDATIONS),
  isFinalSubmitted: z.boolean().default(true),
});

const updateFeedbackBodySchema = submitFeedbackBodySchema.partial();

const createHiringDecisionBodySchema = z.object({
  decision: z.enum(HIRING_DECISIONS),
  targetApplicationStatus: z
    .enum(['OFFERED', 'HIRED', 'REJECTED', 'INTERVIEW', 'SHORTLISTED'])
    .optional(),
  decisionReason: z.string().trim().min(3, 'Decision reason is required').max(2000),
  internalNotes: z.string().trim().max(4000).nullable().optional(),
});

const candidateRescheduleRequestBodySchema = z
  .object({
    requestedDate: z.string().min(1, 'Requested date is required'),
    requestedStartTime: z.string().min(1, 'Requested start time is required'),
    requestedEndTime: z.string().min(1, 'Requested end time is required'),
    timeZone: z.string().trim().min(1).max(80).default('Asia/Kolkata'),
    reason: z.string().trim().min(5, 'Please provide a reason for rescheduling').max(1000),
  })
  .superRefine((data, ctx) => {
    const s = new Date(data.requestedStartTime);
    const e = new Date(data.requestedEndTime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedEndTime'],
        message: 'Requested end time must be after requested start time',
      });
    }
  });

const listRecruiterInterviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  companyId: z.string().uuid().optional().or(z.literal('')),
  jobId: z.string().uuid().optional().or(z.literal('')),
  applicationId: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(INTERVIEW_STATUSES).optional().or(z.literal('')),
  interviewType: z.string().trim().optional(),
  interviewerId: z.string().uuid().optional().or(z.literal('')),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  timeframe: z
    .enum(['ALL', 'UPCOMING', 'TODAY', 'COMPLETED', 'PENDING_FEEDBACK'])
    .optional()
    .or(z.literal('')),
});

const listCandidateInterviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(INTERVIEW_STATUSES).optional().or(z.literal('')),
  timeframe: z.enum(['ALL', 'UPCOMING', 'PAST']).optional().or(z.literal('')),
});

module.exports = {
  INTERVIEW_TYPES,
  INTERVIEW_MODES,
  INTERVIEW_STATUSES,
  INTERVIEWER_ROLES,
  FEEDBACK_RECOMMENDATIONS,
  HIRING_DECISIONS,
  interviewIdParam: z.object({ params: idParamSchema }),
  createInterview: z.object({ body: createInterviewBodySchema }),
  updateInterview: z.object({ params: idParamSchema, body: updateInterviewBodySchema }),
  rescheduleInterview: z.object({ params: idParamSchema, body: rescheduleInterviewBodySchema }),
  cancelInterview: z.object({ params: idParamSchema, body: cancelInterviewBodySchema }),
  completeInterview: z.object({ params: idParamSchema, body: completeInterviewBodySchema }),
  assignInterviewers: z.object({ params: idParamSchema, body: assignInterviewersBodySchema }),
  removeInterviewer: z.object({
    params: z.object({
      id: z.string().uuid(),
      assignmentId: z.string().uuid(),
    }),
  }),
  submitFeedback: z.object({ params: idParamSchema, body: submitFeedbackBodySchema }),
  updateFeedback: z.object({
    params: z.object({
      id: z.string().uuid(),
      feedbackId: z.string().uuid(),
    }),
    body: updateFeedbackBodySchema,
  }),
  createHiringDecision: z.object({
    params: idParamSchema,
    body: createHiringDecisionBodySchema,
  }),
  candidateRescheduleRequest: z.object({
    params: idParamSchema,
    body: candidateRescheduleRequestBodySchema,
  }),
  listRecruiterInterviews: z.object({ query: listRecruiterInterviewsQuerySchema }),
  listCandidateInterviews: z.object({ query: listCandidateInterviewsQuerySchema }),
  statsQuery: z.object({
    query: z.object({
      companyId: z.string().uuid().optional().or(z.literal('')),
    }),
  }),
};
