const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID');

const weightsSchema = z
  .object({
    skill_weight: z.number().min(0).max(1).optional(),
    experience_weight: z.number().min(0).max(1).optional(),
    semantic_weight: z.number().min(0).max(1).optional(),
    llm_weight: z.number().min(0).max(1).optional(),
    project_weight: z.number().min(0).max(1).optional(),
  })
  .optional();

const filtersSchema = z
  .object({
    strict_required_skills: z.boolean().optional(),
    min_required_skill_match_ratio: z.number().min(0).max(1).optional(),
    enforce_experience_range: z.boolean().optional(),
    experience_tolerance_years: z.number().min(0).max(10).optional(),
    mandatory_location: z.boolean().optional(),
    enforce_salary_budget: z.boolean().optional(),
  })
  .optional();

const startMatchingSchema = z.object({
  top_k: z.number().int().min(1).max(50).optional().default(5),
  shortlist_size: z.number().int().min(1).max(200).optional(),
  force_refresh: z.boolean().optional().default(false),
  async_execution: z.boolean().optional().default(true),
  filters: filtersSchema,
  weights: weightsSchema,
});

const rankCandidatesSchema = z.object({
  top_k: z.number().int().min(1).max(100).optional().default(10),
  weights: weightsSchema,
});

const recommendationsSchema = z.object({
  candidate_id: uuidSchema.optional(),
  company_id: uuidSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(5),
  min_skill_overlap: z.number().min(0).max(1).optional().default(0),
  experience_tolerance_years: z.number().min(0).max(10).optional().default(2),
  force_refresh: z.boolean().optional().default(false),
});

module.exports = {
  uuidSchema,
  startMatchingSchema,
  rankCandidatesSchema,
  recommendationsSchema,
};
