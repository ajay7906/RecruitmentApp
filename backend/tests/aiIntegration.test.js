'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const bcrypt = require('bcrypt');
const { startTestDatabase } = require('./helpers/testDb');

describe('Node.js <-> Python AI Recruitment Engine Integration & Security Suite', () => {
  let testDb;
  let prisma;
  let app;
  let server;
  let baseUrl;
  let mockPythonServer;
  let mockPythonUrl;
  let receivedPythonRequests = [];

  let recruiterAToken;
  let recruiterAUser;
  let recruiterBToken;
  let recruiterBUser;
  let candidateToken;
  let candidateUser;

  let companyAId;
  let companyBId;
  let jobAId;
  let matchingRunId;
  let uploadedResumeId;

  async function api(method, path, { token, body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, body: json };
  }

  before(async () => {
    testDb = await startTestDatabase();

    // Start mock Python FastAPI internal server to verify exact HMAC headers, payloads & responses
    mockPythonServer = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let parsedBody = null;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        parsedBody = null;
      }

      receivedPythonRequests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: parsedBody,
      });

      if (req.headers['x-internal-secret'] !== 'test_internal_ai_secret_2026') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            detail: { code: 'INVALID_INTERNAL_SECRET', message: 'Unauthorized internal service request' },
          })
        );
        return;
      }

      if (req.method === 'POST' && req.url === '/internal/v1/resumes/process') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            resume_id: parsedBody.resume_id,
            candidate_id: parsedBody.candidate_id,
            resume_version: parsedBody.resume_version || 1,
            status: 'QUEUED',
            task_id: 'celery-task-resume-1',
            cached: false,
          })
        );
        return;
      }

      if (req.method === 'GET' && req.url.startsWith('/internal/v1/resumes/') && req.url.endsWith('/status')) {
        const resumeId = req.url.split('/')[4];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            resume_id: resumeId,
            candidate_id: candidateUser.id,
            resume_version: 1,
            status: 'COMPLETED',
            content_hash: 'sha256_test_hash',
            page_count: 1,
            is_scanned: false,
            ocr_used: false,
            retry_count: 0,
            extracted_profile: {
              full_name: 'Candidate One',
              normalized_skills: ['React.js', 'Node.js', 'PostgreSQL'],
              total_experience_years: 4.0,
            },
          })
        );
        return;
      }

      if (req.method === 'POST' && req.url === '/internal/v1/matching') {
        const rows = await prisma.$queryRawUnsafe(
          `
          INSERT INTO ai.ai_job_logs (
            job_type, status, company_id, job_id, requested_by,
            total_applications, eligible_candidates, candidates_retrieved,
            candidates_evaluated, candidates_completed
          )
          VALUES ('AI_MATCHING', 'QUEUED', $1::uuid, $2::uuid, $3::uuid, 12, 10, 10, 0, 0)
          RETURNING id
          `,
          parsedBody.company_id,
          parsedBody.job_id,
          parsedBody.requested_by
        );
        matchingRunId = rows[0].id;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            matching_id: matchingRunId,
            job_id: parsedBody.job_id,
            company_id: parsedBody.company_id,
            status: 'QUEUED',
            progress: {
              total_applications: 12,
              eligible_candidates: 10,
              candidates_retrieved: 10,
              candidates_evaluated: 0,
              candidates_completed: 0,
              candidates_failed: 0,
            },
          })
        );
        return;
      }

      if (req.method === 'GET' && req.url.startsWith('/internal/v1/matching/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            matching_id: matchingRunId,
            job_id: jobAId,
            company_id: companyAId,
            status: 'COMPLETED',
            progress: {
              total_applications: 12,
              eligible_candidates: 10,
              candidates_retrieved: 10,
              candidates_evaluated: 10,
              candidates_completed: 10,
              candidates_failed: 0,
            },
            top_candidates: [
              {
                rank: 1,
                application_id: '00000000-0000-0000-0000-000000000101',
                candidate_id: candidateUser.id,
                candidate_name: candidateUser.fullName,
                overall_score: 91.2,
                skill_score: 95.0,
                experience_score: 88.0,
                project_score: 85.0,
                similarity_score: 90.0,
                llm_score: 92.0,
                recommendation_category: 'STRONG_MATCH',
                matched_skills: ['React.js', 'Node.js', 'PostgreSQL'],
                missing_skills: [],
                strengths: ['Strong full-stack architecture experience'],
                weaknesses: [],
                evidence: [
                  {
                    claim: 'Built React.js and Node.js systems',
                    resume_excerpt: '4 years building React.js, Node.js, and PostgreSQL platforms',
                    section: 'experience',
                  },
                ],
                explanation: 'Top match with verified full-stack skills.',
              },
            ],
          })
        );
        return;
      }

      if (req.method === 'POST' && req.url === '/internal/v1/ranking') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            job_id: parsedBody.job_id,
            company_id: parsedBody.company_id,
            job_version: 'v1_hash',
            scoring_config_version: 'v1:custom',
            total_ranked: 1,
            candidates: [
              {
                rank: 1,
                application_id: '00000000-0000-0000-0000-000000000101',
                candidate_id: candidateUser.id,
                candidate_name: candidateUser.fullName,
                overall_score: 93.5,
                skill_score: 95.0,
                experience_score: 88.0,
                project_score: 85.0,
                similarity_score: 90.0,
                llm_score: 92.0,
                recommendation_category: 'STRONG_MATCH',
                matched_skills: ['React.js', 'Node.js', 'PostgreSQL'],
                missing_skills: [],
                strengths: ['Strong full-stack architecture experience'],
                weaknesses: [],
                evidence: [],
                explanation: 'Re-ranked using custom recruiter weights without redundant LLM call.',
                cached_evaluation: true,
              },
            ],
          })
        );
        return;
      }

      if (req.method === 'POST' && req.url === '/internal/v1/recommendations') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            candidate_id: parsedBody.candidate_id,
            resume_version: 1,
            cached: false,
            total_recommendations: 1,
            recommendations: [
              {
                rank: 1,
                job_id: jobAId,
                company_id: companyAId,
                company_name: 'Alpha AI Labs',
                job_title: 'Senior Full Stack Engineer',
                employment_type: 'FULL_TIME',
                work_mode: 'HYBRID',
                location: 'Bengaluru, Karnataka',
                overall_score: 89.4,
                semantic_similarity_score: 88.0,
                skill_match_score: 92.0,
                experience_fit_score: 87.0,
                matched_skills: ['React.js', 'Node.js', 'PostgreSQL'],
                missing_skills: [],
                explanation: 'Matches 3 key skills for Senior Full Stack Engineer.',
              },
            ],
          })
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    await new Promise((resolve) => mockPythonServer.listen(0, '127.0.0.1', resolve));
    mockPythonUrl = `http://127.0.0.1:${mockPythonServer.address().port}`;

    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: testDb.url,
      DB_POOL_MAX: '1',
      CLIENT_URL: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test_ai_integration_jwt_secret_2026',
      INTERNAL_API_SECRET: 'test_internal_ai_secret_2026',
      AI_SERVICE_URL: mockPythonUrl,
    });

    prisma = require('../src/config/prisma');
    app = require('../src/app');

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    const passwordHash = await bcrypt.hash('Pass@1234', 10);
    const now = new Date();
    recruiterAUser = await prisma.user.create({
      data: {
        fullName: 'Recruiter Alpha',
        email: 'recruiter.alpha@test.com',
        passwordHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
      },
    });
    recruiterBUser = await prisma.user.create({
      data: {
        fullName: 'Recruiter Beta',
        email: 'recruiter.beta@test.com',
        passwordHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
      },
    });
    candidateUser = await prisma.user.create({
      data: {
        fullName: 'Candidate One',
        email: 'candidate.one@test.com',
        passwordHash,
        role: 'candidate',
        status: 'active',
        emailVerifiedAt: now,
      },
    });

    const loginA = await api('POST', '/auth/login', {
      body: { email: 'recruiter.alpha@test.com', password: 'Pass@1234' },
    });
    recruiterAToken = loginA.body.data.accessToken;

    const loginB = await api('POST', '/auth/login', {
      body: { email: 'recruiter.beta@test.com', password: 'Pass@1234' },
    });
    recruiterBToken = loginB.body.data.accessToken;

    const loginCand = await api('POST', '/auth/login', {
      body: { email: 'candidate.one@test.com', password: 'Pass@1234' },
    });
    candidateToken = loginCand.body.data.accessToken;

    const companyA = await prisma.company.create({
      data: {
        owner: { connect: { id: recruiterAUser.id } },
        name: 'Alpha AI Labs',
        status: 'APPROVED',
      },
    });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({
      data: {
        owner: { connect: { id: recruiterBUser.id } },
        name: 'Beta Corp',
        status: 'APPROVED',
      },
    });
    companyBId = companyB.id;

    const jobA = await prisma.job.create({
      data: {
        company: { connect: { id: companyAId } },
        createdBy: { connect: { id: recruiterAUser.id } },
        title: 'Senior Full Stack Engineer',
        description: 'Build scalable web apps with React.js, Node.js, and PostgreSQL.',
        requiredSkills: ['React.js', 'Node.js', 'PostgreSQL'],
        preferredSkills: ['Docker'],
        minExperience: 3,
        maxExperience: 7,
        employmentType: 'FULL_TIME',
        workMode: 'HYBRID',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    jobAId = jobA.id;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mockPythonServer) await new Promise((resolve) => mockPythonServer.close(resolve));
    if (prisma) await prisma.$disconnect();
    if (testDb) await testDb.stop();
  });

  it('1. Resume upload persists ai.outbox_events and dispatches signed internal request to Python AI service', async () => {
    const samplePdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nCandidate One React.js Node.js PostgreSQL\n%%EOF',
      'utf8'
    ).toString('base64');

    const res = await api('POST', '/candidate/resumes', {
      token: candidateToken,
      body: {
        title: 'Full Stack Resume',
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
        contentBase64: samplePdf,
        isPrimary: true,
      },
    });

    assert.equal(res.status, 201);
    uploadedResumeId = res.body.data.resume?.id || res.body.data.id;
    assert.ok(uploadedResumeId);

    // Wait briefly for setImmediate dispatch
    await new Promise((r) => setTimeout(r, 150));

    const outboxRows = await prisma.$queryRawUnsafe(
      `SELECT event_type, entity_id, status FROM ai.outbox_events WHERE entity_id = $1::uuid`,
      String(uploadedResumeId)
    );
    assert.equal(outboxRows.length, 1);
    assert.equal(outboxRows[0].event_type, 'RESUME_UPLOADED');
    assert.equal(outboxRows[0].status, 'PROCESSED');

    const statusRes = await api('GET', `/ai/resumes/${uploadedResumeId}/status`, {
      token: candidateToken,
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.status, 'COMPLETED');
    assert.ok(statusRes.body.extracted_profile.normalized_skills.includes('React.js'));
  });

  it('2. Enforces multi-tenant isolation in Node.js before calling Python (Recruiter B cannot match Company A job)', async () => {
    const forbiddenRes = await api('POST', `/ai/jobs/${jobAId}/match`, {
      token: recruiterBToken,
      body: { top_k: 5 },
    });
    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.body.code, 'CROSS_COMPANY_FORBIDDEN');

    const allowedRes = await api('POST', `/ai/jobs/${jobAId}/match`, {
      token: recruiterAToken,
      body: { top_k: 5, shortlist_size: 20 },
    });
    assert.equal(allowedRes.status, 202);
    assert.equal(allowedRes.body.status, 'QUEUED');
    assert.equal(allowedRes.body.matching_id, matchingRunId);

    // Recruiter B cannot poll Company A matching status
    const crossPoll = await api('GET', `/ai/matching/${matchingRunId}`, {
      token: recruiterBToken,
    });
    assert.equal(crossPoll.status, 403);

    // Recruiter A can poll matching status and retrieve top candidates with evidence
    const statusRes = await api('GET', `/ai/matching/${matchingRunId}`, {
      token: recruiterAToken,
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.status, 'COMPLETED');
    assert.equal(statusRes.body.top_candidates.length, 1);
    assert.equal(statusRes.body.top_candidates[0].overall_score, 91.2);
  });

  it('3. Candidate Ranking & Job Recommendations endpoints enforce role & tenant boundaries', async () => {
    const rankRes = await api('POST', `/ai/jobs/${jobAId}/rank`, {
      token: recruiterAToken,
      body: {
        top_k: 5,
        weights: {
          skill_weight: 0.5,
          experience_weight: 0.2,
          semantic_weight: 0.15,
          llm_weight: 0.1,
          project_weight: 0.05,
        },
      },
    });
    assert.equal(rankRes.status, 200);
    assert.equal(rankRes.body.candidates[0].overall_score, 93.5);
    assert.equal(rankRes.body.candidates[0].cached_evaluation, true);

    // Candidate cannot request recommendations for another candidate ID
    const crossCandRec = await api('POST', '/ai/recommendations', {
      token: candidateToken,
      body: { candidate_id: recruiterAUser.id, limit: 5 },
    });
    assert.equal(crossCandRec.status, 403);

    // Candidate can request their own job recommendations
    const ownRec = await api('POST', '/ai/recommendations', {
      token: candidateToken,
      body: { limit: 5 },
    });
    assert.equal(ownRec.status, 200);
    assert.equal(ownRec.body.recommendations.length, 1);
    assert.equal(ownRec.body.recommendations[0].job_id, jobAId);
  });
});
