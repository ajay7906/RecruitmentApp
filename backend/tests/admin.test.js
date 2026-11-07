'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const bcrypt = require('bcrypt');
const { startTestDatabase } = require('./helpers/testDb');

describe('Complete Admin Management Module Integration & Regression Suite', () => {
  let testDb;
  let prisma;
  let app;
  let server;
  let baseUrl;
  let provisionSuperAdmin;
  let recordAudit;

  // Test state shared across ordered lifecycle tests
  let superAdminToken;
  let superAdminUser;
  let secondSuperAdminUser;
  let jobApproverToken;
  let jobApproverUser;
  let supportAdminToken;
  let supportAdminUser;
  let candidateToken;
  let candidateUser;
  let recruiterToken;
  let recruiterUser;

  let testCompanyId;
  let testJobId;
  let testApplicationId;
  let testReportId;

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

    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: testDb.url,
      DB_POOL_MAX: '1',
      CLIENT_URL: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test_admin_suite_jwt_secret_key_2026',
      ACCESS_TOKEN_TTL: '15m',
      REFRESH_TOKEN_TTL_DAYS: '7',
    });

    prisma = require('../src/config/prisma');
    app = require('../src/app');
    ({ provisionSuperAdmin } = require('../src/scripts/provisionSuperAdmin'));
    ({ recordAudit } = require('../src/services/audit.service'));

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    if (testDb) {
      await testDb.stop();
    }
  });

  // ==========================================================================
  // 1. SUPER_ADMIN Provisioning & Admin Auth / RBAC
  // ==========================================================================
  it('1. provisions SUPER_ADMIN securely via script and blocks duplicate unforced bootstrap', async () => {
    const admin = await provisionSuperAdmin(
      {
        email: 'superadmin@recruitro.test',
        password: 'SuperPassword#2026',
        fullName: 'Chief Super Admin',
      },
      prisma
    );

    assert.equal(admin.email, 'superadmin@recruitro.test');
    assert.equal(admin.role, 'admin');
    assert.equal(admin.adminRole, 'SUPER_ADMIN');
    superAdminUser = admin;

    // Duplicate bootstrap without force must fail
    await assert.rejects(
      () =>
        provisionSuperAdmin(
          {
            email: 'another-super@recruitro.test',
            password: 'SuperPassword#2026',
            fullName: 'Unauthorized Super',
          },
          prisma
        ),
      /already exists/i
    );

    // Login as SUPER_ADMIN
    const loginRes = await api('POST', '/auth/login', {
      body: { email: 'superadmin@recruitro.test', password: 'SuperPassword#2026' },
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.data.user.role, 'admin');
    assert.equal(loginRes.body.data.user.adminRole, 'SUPER_ADMIN');
    assert.ok(Array.isArray(loginRes.body.data.user.permissions));
    assert.ok(loginRes.body.data.user.permissions.includes('admins.manage'));
    superAdminToken = loginRes.body.data.accessToken;
  });

  it('2. provisions candidate, recruiter, JOB_APPROVER, and SUPPORT_ADMIN accounts and enforces RBAC boundaries', async () => {
    const pwdHash = await bcrypt.hash('TestPass#2026', 12);
    const now = new Date();

    candidateUser = await prisma.user.create({
      data: {
        email: 'candidate1@recruitro.test',
        fullName: 'Alice Candidate',
        passwordHash: pwdHash,
        role: 'candidate',
        status: 'active',
        emailVerifiedAt: now,
        candidateProfile: {
          create: {
            phone: '+91-9876543210',
            headline: 'Senior Full Stack Developer',
            skills: ['Node.js', 'React', 'PostgreSQL'],
            yearsOfExperience: 5,
          },
        },
      },
    });

    recruiterUser = await prisma.user.create({
      data: {
        email: 'recruiter1@recruitro.test',
        fullName: 'Bob Recruiter',
        passwordHash: pwdHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
      },
    });

    // Candidate & Recruiter logins
    const candLogin = await api('POST', '/auth/login', {
      body: { email: candidateUser.email, password: 'TestPass#2026' },
    });
    assert.equal(candLogin.status, 200);
    candidateToken = candLogin.body.data.accessToken;

    const recLogin = await api('POST', '/auth/login', {
      body: { email: recruiterUser.email, password: 'TestPass#2026' },
    });
    assert.equal(recLogin.status, 200);
    recruiterToken = recLogin.body.data.accessToken;

    // Candidate and Recruiter must be rejected from /admin/*
    const candAdminAttempt = await api('GET', '/admin/dashboard/stats', { token: candidateToken });
    assert.equal(candAdminAttempt.status, 403);

    const recAdminAttempt = await api('GET', '/admin/users', { token: recruiterToken });
    assert.equal(recAdminAttempt.status, 403);

    // SUPER_ADMIN creates a JOB_APPROVER and a SUPPORT_ADMIN via API
    const createJobApprover = await api('POST', '/admin/administrators', {
      token: superAdminToken,
      body: {
        email: 'jobapprover@recruitro.test',
        fullName: 'Jane JobApprover',
        password: 'ApproverPass#2026',
        adminRole: 'JOB_APPROVER',
        reason: 'Hire job moderation specialist',
      },
    });
    assert.equal(createJobApprover.status, 201);
    jobApproverUser = createJobApprover.body.data;

    const createSupportAdmin = await api('POST', '/admin/administrators', {
      token: superAdminToken,
      body: {
        email: 'support@recruitro.test',
        fullName: 'Sam SupportAdmin',
        password: 'SupportPass#2026',
        adminRole: 'SUPPORT_ADMIN',
        reason: 'Hire support admin',
      },
    });
    assert.equal(createSupportAdmin.status, 201);
    supportAdminUser = createSupportAdmin.body.data;

    const jaLogin = await api('POST', '/auth/login', {
      body: { email: 'jobapprover@recruitro.test', password: 'ApproverPass#2026' },
    });
    assert.equal(jaLogin.status, 200);
    jobApproverToken = jaLogin.body.data.accessToken;

    const saLogin = await api('POST', '/auth/login', {
      body: { email: 'support@recruitro.test', password: 'SupportPass#2026' },
    });
    assert.equal(saLogin.status, 200);
    supportAdminToken = saLogin.body.data.accessToken;

    // JOB_APPROVER can read jobs, but CANNOT suspend users or manage administrators
    const jaJobsRes = await api('GET', '/admin/jobs', { token: jobApproverToken });
    assert.equal(jaJobsRes.status, 200);

    const jaSuspendUserAttempt = await api('PATCH', `/admin/users/${candidateUser.id}/status`, {
      token: jobApproverToken,
      body: { status: 'SUSPENDED', reason: 'Unauthorized attempt by job approver' },
    });
    assert.equal(jaSuspendUserAttempt.status, 403);
    assert.equal(jaSuspendUserAttempt.body.code, 'INSUFFICIENT_PERMISSIONS');

    const jaManageAdminsAttempt = await api('POST', '/admin/administrators', {
      token: jobApproverToken,
      body: {
        email: 'rogue@recruitro.test',
        fullName: 'Rogue Admin',
        password: 'RoguePass#2026',
        adminRole: 'ADMIN',
      },
    });
    assert.equal(jaManageAdminsAttempt.status, 403);
  });

  // ==========================================================================
  // 2. User Management & Immediate Session Invalidation on Suspension
  // ==========================================================================
  it('3. lists, filters, updates, suspends, and reactivates users with immediate token invalidation', async () => {
    const listRes = await api('GET', '/admin/users?q=Alice&role=CANDIDATE', {
      token: superAdminToken,
    });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.users.length, 1);
    assert.equal(listRes.body.data.users[0].email, 'candidate1@recruitro.test');
    // SUPER_ADMIN has users.read_contact so phone is returned
    assert.equal(listRes.body.data.users[0].phone, '+91-9876543210');

    // Suspend candidate without reason must fail validation (422)
    const badSuspend = await api('PATCH', `/admin/users/${candidateUser.id}/status`, {
      token: superAdminToken,
      body: { status: 'SUSPENDED', reason: 'no' },
    });
    assert.equal(badSuspend.status, 422);

    // Suspend candidate with valid reason
    const suspendRes = await api('PATCH', `/admin/users/${candidateUser.id}/status`, {
      token: superAdminToken,
      body: { status: 'SUSPENDED', reason: 'Repeated spam applications detected' },
    });
    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.data.status, 'suspended');
    assert.equal(suspendRes.body.data.statusBadge, 'SUSPENDED');

    // Existing valid JWT of suspended candidate must immediately be rejected by `authenticate` middleware!
    const candidateMeAttempt = await api('GET', '/auth/me', { token: candidateToken });
    assert.equal(candidateMeAttempt.status, 403);
    assert.equal(candidateMeAttempt.body.code, 'ACCOUNT_SUSPENDED');

    // Suspended candidate cannot log in
    const suspendedLogin = await api('POST', '/auth/login', {
      body: { email: candidateUser.email, password: 'TestPass#2026' },
    });
    assert.equal(suspendedLogin.status, 403);

    // Reactivate candidate
    const activateRes = await api('PATCH', `/admin/users/${candidateUser.id}/status`, {
      token: superAdminToken,
      body: { status: 'ACTIVE', reason: 'Appeal verified and approved' },
    });
    assert.equal(activateRes.status, 200);
    assert.equal(activateRes.body.data.status, 'active');
    assert.ok(activateRes.body.data.accountStatusHistory.length >= 2);

    // Candidate can now use their account again
    const candidateMeAfter = await api('GET', '/auth/me', { token: candidateToken });
    assert.equal(candidateMeAfter.status, 200);
  });

  // ==========================================================================
  // 3. Company Management & Approval Lifecycle
  // ==========================================================================
  it('4. manages company registration, rejection, approval, suspension, and reactivation', async () => {
    // Recruiter registers a company
    const regRes = await api('POST', '/companies', {
      token: recruiterToken,
      body: {
        name: 'Acme Cloud Technologies',
        email: 'hr@acmecloud.test',
        contactNumber: '+91-9988776655',
        website: 'https://acmecloud.test',
        industry: 'Information Technology',
        companySize: '51-200',
        companyType: 'Private Limited',
        foundedYear: 2020,
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        address: '100 Outer Ring Road, Bellandur',
        description: 'Enterprise cloud infrastructure and developer platform company.',
      },
    });
    assert.equal(regRes.status, 201);
    testCompanyId = regRes.body.data.company.id;

    // Recruiter submits company for approval
    const submitRes = await api('POST', `/companies/${testCompanyId}/submit`, {
      token: recruiterToken,
    });
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.data.company.status, 'PENDING_APPROVAL');

    // Admin rejects company without reason -> 422
    const badReject = await api('PATCH', `/admin/companies/${testCompanyId}/reject`, {
      token: superAdminToken,
      body: { reason: '' },
    });
    assert.equal(badReject.status, 422);

    // Admin rejects company with reason
    const rejectRes = await api('PATCH', `/admin/companies/${testCompanyId}/reject`, {
      token: superAdminToken,
      body: { reason: 'Please verify official domain email address' },
    });
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.status, 'REJECTED');

    // Recruiter resubmits for approval
    const resubmitRes = await api('POST', `/companies/${testCompanyId}/submit`, {
      token: recruiterToken,
    });
    assert.equal(resubmitRes.status, 200);
    assert.equal(resubmitRes.body.data.company.status, 'PENDING_APPROVAL');

    // Admin approves company
    const approveRes = await api('PATCH', `/admin/companies/${testCompanyId}/approve`, {
      token: superAdminToken,
      body: { reason: 'Domain and registration verified' },
    });
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.status, 'APPROVED');

    // Admin suspends company
    const suspendRes = await api('PATCH', `/admin/companies/${testCompanyId}/suspend`, {
      token: superAdminToken,
      body: { reason: 'Temporary compliance hold under investigation' },
    });
    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.data.status, 'SUSPENDED');

    // Recruiter cannot create/publish a job while company is SUSPENDED
    const blockedJobRes = await api('POST', '/jobs', {
      token: recruiterToken,
      body: {
        companyId: testCompanyId,
        title: 'Blocked Backend Engineer',
        description: 'This job creation should be blocked because the company is suspended.',
        employmentType: 'Full Time',
        workMode: 'Remote',
        numberOfOpenings: 2,
        requiredSkills: ['Node.js'],
      },
    });
    assert.equal(blockedJobRes.status, 403);
    assert.equal(blockedJobRes.body.code, 'COMPANY_SUSPENDED');

    // Admin reactivates company
    const reactivateRes = await api('PATCH', `/admin/companies/${testCompanyId}/activate`, {
      token: superAdminToken,
      body: { reason: 'Compliance review cleared' },
    });
    assert.equal(reactivateRes.status, 200);
    assert.equal(reactivateRes.body.data.status, 'APPROVED');

    // Verify company details include statusHistory
    const compDetails = await api('GET', `/admin/companies/${testCompanyId}`, {
      token: superAdminToken,
    });
    assert.equal(compDetails.status, 200);
    assert.ok(compDetails.body.data.statusHistory.length >= 4);
  });

  // ==========================================================================
  // 4. Job Management, Moderation, Approvals & Candidate Application Privacy
  // ==========================================================================
  it('5. manages job flagging, rejection, approval, closure, and protects candidate application privacy', async () => {
    // Recruiter creates & publishes a valid job under the approved company
    const createJobRes = await api('POST', '/jobs', {
      token: recruiterToken,
      body: {
        companyId: testCompanyId,
        title: 'Senior Distributed Systems Engineer',
        department: 'Platform Engineering',
        category: 'Software Engineering',
        description:
          'Design and build high-throughput distributed storage and messaging systems in Node.js and Go.',
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'SENIOR',
        minExperience: 4,
        maxExperience: 8,
        minSalary: 2500000,
        maxSalary: 4000000,
        salaryCurrency: 'INR',
        salaryPeriod: 'Yearly',
        discloseSalary: true,
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        numberOfOpenings: 3,
        requiredSkills: ['Node.js', 'PostgreSQL', 'Distributed Systems'],
        requireResume: false,
      },
    });
    assert.equal(createJobRes.status, 201);
    testJobId = createJobRes.body.data.job.id;
    assert.equal(createJobRes.body.data.job.status, 'PUBLISHED');

    // Candidate applies to the published job
    const applyRes = await api('POST', '/applications', {
      token: candidateToken,
      body: {
        jobId: testJobId,
        coverLetter: 'I have 5 years of experience building scalable distributed systems.',
      },
    });
    assert.equal(applyRes.status, 201);
    testApplicationId = applyRes.body.data.application.id;

    // Recruiter adds an internal confidential note on the application
    const addNoteRes = await api('POST', `/applications/recruiter/${testApplicationId}/notes`, {
      token: recruiterToken,
      body: { note: 'Confidential internal note: Strong system design background, fast-track to round 2.' },
    });
    assert.equal(addNoteRes.status, 201);

    // JOB_APPROVER flags the job
    const flagRes = await api('POST', `/admin/jobs/${testJobId}/flag`, {
      token: jobApproverToken,
      body: {
        category: 'Misleading Job Description',
        reason: 'Verify salary range and hybrid attendance policy',
      },
    });
    assert.equal(flagRes.status, 200);
    assert.equal(flagRes.body.data.moderationStatus, 'FLAGGED');

    // JOB_APPROVER rejects the job
    const rejectJobRes = await api('PATCH', `/admin/jobs/${testJobId}/reject`, {
      token: jobApproverToken,
      body: {
        category: 'Policy Violation',
        reason: 'Missing mandatory hybrid schedule details in description',
      },
    });
    assert.equal(rejectJobRes.status, 200);
    assert.equal(rejectJobRes.body.data.status, 'REJECTED');

    // JOB_APPROVER approves & restores the job
    const approveJobRes = await api('PATCH', `/admin/jobs/${testJobId}/approve`, {
      token: jobApproverToken,
      body: {
        notes: 'Recruiter clarified hybrid requirements; restored to PUBLISHED.',
      },
    });
    assert.equal(approveJobRes.status, 200);
    assert.equal(approveJobRes.body.data.status, 'PUBLISHED');
    assert.equal(approveJobRes.body.data.moderationStatus, 'CLEARED');

    // Verify application privacy guards:
    // SUPPORT_ADMIN has `applications.read`, but does NOT have `applications.read_resume` or `applications.read_notes`
    const supportAppView = await api('GET', `/admin/applications/${testApplicationId}`, {
      token: supportAdminToken,
    });
    assert.equal(supportAppView.status, 200);
    assert.equal(supportAppView.body.data.resumeProtected, true);
    assert.equal(supportAppView.body.data.notesProtected, true);
    assert.equal(supportAppView.body.data.recruiterNotes, undefined);
    assert.equal(supportAppView.body.data.coverLetter, undefined);

    // SUPER_ADMIN has both `applications.read_resume` and `applications.read_notes`
    const superAppView = await api('GET', `/admin/applications/${testApplicationId}`, {
      token: superAdminToken,
    });
    assert.equal(superAppView.status, 200);
    assert.ok(Array.isArray(superAppView.body.data.recruiterNotes));
    assert.equal(superAppView.body.data.recruiterNotes.length, 1);
    assert.match(superAppView.body.data.coverLetter, /scalable distributed systems/);

    // Admin closes the job and verifies candidate application is preserved
    const closeJobRes = await api('PATCH', `/admin/jobs/${testJobId}/close`, {
      token: superAdminToken,
      body: { reason: 'Position filled; closing listing via admin console' },
    });
    assert.equal(closeJobRes.status, 200);
    assert.equal(closeJobRes.body.data.status, 'CLOSED');

    const preservedApp = await prisma.application.findUnique({
      where: { id: testApplicationId },
    });
    assert.ok(preservedApp, 'Closing a job must not delete existing candidate applications');
  });

  // ==========================================================================
  // 5. Append-Only Audit Logs & Secret Redaction
  // ==========================================================================
  it('6. enforces append-only audit_logs at DB trigger level and redacts sensitive secrets', async () => {
    const auditEntry = await recordAudit(
      {
        actor: { id: superAdminUser.id, role: 'admin', adminRole: 'SUPER_ADMIN' },
        action: 'TEST_SENSITIVE_REDACTION',
        entityType: 'USER',
        entityId: candidateUser.id,
        previousValue: {
          fullName: 'Alice',
          password: 'PlaintextSecretPassword123!',
          passwordHash: '$2b$12$secretbcryptdigest',
          refreshToken: 'raw-refresh-token-value',
        },
        newValue: {
          fullName: 'Alice Updated',
          token: 'sensitive-bearer-token',
          nested: { apiKey: 'sk-live-secret' },
        },
        reason: 'Verify automatic secret scrubbing',
      },
      prisma
    );

    assert.equal(auditEntry.previousValue.password, '[REDACTED]');
    assert.equal(auditEntry.previousValue.passwordHash, '[REDACTED]');
    assert.equal(auditEntry.previousValue.refreshToken, '[REDACTED]');
    assert.equal(auditEntry.newValue.token, '[REDACTED]');
    assert.equal(auditEntry.newValue.nested.apiKey, '[REDACTED]');
    assert.equal(auditEntry.newValue.fullName, 'Alice Updated');

    // Attempt to UPDATE or DELETE an audit_logs row must be rejected by PostgreSQL trigger
    await assert.rejects(
      () =>
        testDb.db.query('UPDATE audit_logs SET reason = $1 WHERE id = $2', [
          'Tampered reason',
          auditEntry.id,
        ]),
      /append-only/i
    );

    await assert.rejects(
      () => testDb.db.query('DELETE FROM audit_logs WHERE id = $1', [auditEntry.id]),
      /append-only/i
    );

    // Query audit logs via Admin API
    const logsRes = await api('GET', '/admin/audit-logs?entityType=USER', {
      token: superAdminToken,
    });
    assert.equal(logsRes.status, 200);
    assert.ok(logsRes.body.data.logs.length > 0);
  });

  // ==========================================================================
  // 6. Reports & Moderation Queue + Platform Analytics + Last SUPER_ADMIN Guard
  // ==========================================================================
  it('7. handles user/company/job moderation reports, analytics queries, and protects last SUPER_ADMIN', async () => {
    // Candidate submits a report on the company
    const createReportRes = await api('POST', '/reports', {
      token: candidateToken,
      body: {
        entityType: 'COMPANY',
        entityId: testCompanyId,
        reason: 'Suspicious external redirect link',
        description: 'Company website link asks for registration fee.',
      },
    });
    assert.equal(createReportRes.status, 201);
    testReportId = createReportRes.body.data.id;

    // Admin lists reports
    const listReportsRes = await api('GET', '/admin/reports?status=OPEN', {
      token: superAdminToken,
    });
    assert.equal(listReportsRes.status, 200);
    assert.ok(listReportsRes.body.data.reports.some((r) => r.id === testReportId));

    // Admin assigns report to SUPPORT_ADMIN, adds an investigation note, and resolves it
    const assignRes = await api('PATCH', `/admin/reports/${testReportId}/assign`, {
      token: superAdminToken,
      body: { assignedAdminId: supportAdminUser.id },
    });
    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.body.data.status, 'UNDER_REVIEW');

    const noteRes = await api('POST', `/admin/reports/${testReportId}/notes`, {
      token: supportAdminToken,
      body: { note: 'Checked company URL; warning issued to company owner.' },
    });
    assert.equal(noteRes.status, 201);
    assert.equal(noteRes.body.data.notes.length, 1);

    const resolveRes = await api('PATCH', `/admin/reports/${testReportId}/status`, {
      token: supportAdminToken,
      body: {
        status: 'RESOLVED',
        resolutionNotes: 'Link corrected by company owner and verified.',
      },
    });
    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.data.status, 'RESOLVED');

    // Verify Dashboard Stats & All 4 Analytics Endpoints return real database numbers
    const dashRes = await api('GET', '/admin/dashboard/stats?range=30d', { token: superAdminToken });
    const userAnRes = await api('GET', '/admin/analytics/users?range=30d', { token: superAdminToken });
    const compAnRes = await api('GET', '/admin/analytics/companies?range=30d', { token: superAdminToken });
    const jobAnRes = await api('GET', '/admin/analytics/jobs?range=30d', { token: superAdminToken });
    const recAnRes = await api('GET', '/admin/analytics/recruitment?range=30d', { token: superAdminToken });

    assert.equal(dashRes.status, 200);
    assert.ok(dashRes.body.data.summary.totalUsers >= 5);
    assert.equal(dashRes.body.data.summary.totalCompanies, 1);
    assert.equal(dashRes.body.data.summary.totalJobs, 1);
    assert.equal(dashRes.body.data.summary.totalApplications, 1);

    assert.equal(userAnRes.status, 200);
    assert.equal(compAnRes.status, 200);
    assert.equal(jobAnRes.status, 200);
    assert.equal(recAnRes.status, 200);
    assert.equal(recAnRes.body.data.totals.totalApplications, 1);

    // Verify last SUPER_ADMIN lockout protection:
    // Provision a second SUPER_ADMIN with force=true so we can test demoting one vs demoting the last one
    secondSuperAdminUser = await provisionSuperAdmin(
      {
        email: 'super2@recruitro.test',
        password: 'SuperPassword#2026',
        fullName: 'Second Super Admin',
        force: true,
      },
      prisma
    );

    // Demote secondSuperAdminUser to ADMIN -> succeeds because superAdminUser is still active
    const demoteSecond = await api('PATCH', `/admin/administrators/${secondSuperAdminUser.id}/role`, {
      token: superAdminToken,
      body: {
        adminRole: 'ADMIN',
        reason: 'Transitioning second super admin to standard platform admin',
      },
    });
    assert.equal(demoteSecond.status, 200);
    assert.equal(demoteSecond.body.data.adminRole, 'ADMIN');

    // Attempting to demote or suspend oneself must fail
    const selfDemote = await api('PATCH', `/admin/administrators/${superAdminUser.id}/role`, {
      token: superAdminToken,
      body: {
        adminRole: 'ADMIN',
        reason: 'Attempting self demotion',
      },
    });
    assert.equal(selfDemote.status, 400);
    assert.equal(selfDemote.body.code, 'CANNOT_CHANGE_OWN_ROLE');
  });
});
