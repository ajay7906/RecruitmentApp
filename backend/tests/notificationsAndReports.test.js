'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const bcrypt = require('bcrypt');
const { startTestDatabase } = require('./helpers/testDb');

describe('Complete Notifications & Reports Module Integration & Regression Suite', () => {
  let testDb;
  let prisma;
  let app;
  let server;
  let baseUrl;
  let provisionSuperAdmin;
  let emailService;
  let notificationsService;

  let superAdminUser;
  let superAdminToken;
  let candidateUser;
  let candidateToken;
  let secondCandidateUser;
  let secondCandidateToken;
  let recruiterOwnerUser;
  let recruiterOwnerToken;
  let recruiterMemberUser;
  let recruiterMemberToken;
  let unrelatedRecruiterUser;
  let unrelatedRecruiterToken;

  let companyId;
  let jobId;
  let applicationId;

  async function api(method, path, { token, body, raw = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (raw) {
      return {
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        text,
      };
    }

    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: json };
  }

  before(async () => {
    testDb = await startTestDatabase();

    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: testDb.url,
      DB_POOL_MAX: '1',
      CLIENT_URL: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test_notifications_reports_secret_2026',
      ACCESS_TOKEN_TTL: '15m',
      REFRESH_TOKEN_TTL_DAYS: '7',
    });

    prisma = require('../src/config/prisma');
    app = require('../src/app');
    ({ provisionSuperAdmin } = require('../src/scripts/provisionSuperAdmin'));
    emailService = require('../src/services/email.service');
    notificationsService = require('../src/modules/notifications/notifications.service');

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
  });

  after(async () => {
    if (emailService) {
      emailService.setCustomTransport(null);
    }
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
  // 1. Setup Users & Verify Auth / Account Notifications
  // ==========================================================================
  it('1. provisions users and dispatches registration + password change notifications (Email + In-App)', async () => {
    superAdminUser = await provisionSuperAdmin(
      {
        email: 'admin-notif@recruitro.test',
        password: 'SuperPassword#2026',
        fullName: 'Chief Admin',
      },
      prisma
    );

    const adminLogin = await api('POST', '/auth/login', {
      body: { email: 'admin-notif@recruitro.test', password: 'SuperPassword#2026' },
    });
    assert.equal(adminLogin.status, 200);
    superAdminToken = adminLogin.body.data.accessToken;

    const pwdHash = await bcrypt.hash('TestPass#2026', 12);
    const now = new Date();

    candidateUser = await prisma.user.create({
      data: {
        email: 'cand1@recruitro.test',
        fullName: 'Priya Candidate',
        passwordHash: pwdHash,
        role: 'candidate',
        status: 'active',
        emailVerifiedAt: now,
        candidateProfile: {
          create: {
            phone: '+91-9000011111',
            headline: 'Backend Developer',
            skills: ['Node.js', 'PostgreSQL', 'Express'],
            yearsOfExperience: 4,
          },
        },
      },
    });

    secondCandidateUser = await prisma.user.create({
      data: {
        email: 'cand2@recruitro.test',
        fullName: 'Rahul Candidate',
        passwordHash: pwdHash,
        role: 'candidate',
        status: 'active',
        emailVerifiedAt: now,
      },
    });

    recruiterOwnerUser = await prisma.user.create({
      data: {
        email: 'owner@recruitro.test',
        fullName: 'Vikram Owner',
        passwordHash: pwdHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
        recruiterProfile: {
          create: {
            designation: 'VP Engineering',
            phone: '+91-9887766000',
          },
        },
      },
    });

    recruiterMemberUser = await prisma.user.create({
      data: {
        email: 'member@recruitro.test',
        fullName: 'Neha RecruiterMember',
        passwordHash: pwdHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
      },
    });

    unrelatedRecruiterUser = await prisma.user.create({
      data: {
        email: 'other-recruiter@recruitro.test',
        fullName: 'Other Recruiter',
        passwordHash: pwdHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
      },
    });

    const loginUser = async (email) => {
      const res = await api('POST', '/auth/login', {
        body: { email, password: 'TestPass#2026' },
      });
      assert.equal(res.status, 200);
      return res.body.data.accessToken;
    };

    candidateToken = await loginUser(candidateUser.email);
    secondCandidateToken = await loginUser(secondCandidateUser.email);
    recruiterOwnerToken = await loginUser(recruiterOwnerUser.email);
    recruiterMemberToken = await loginUser(recruiterMemberUser.email);
    unrelatedRecruiterToken = await loginUser(unrelatedRecruiterUser.email);

    // Trigger a templated notification with awaitEmail: true & idempotencyKey
    const firstDispatch = await notificationsService.notifyUser({
      recipientId: candidateUser.id,
      recipientEmail: candidateUser.email,
      recipientRole: 'candidate',
      templateKey: 'EMAIL_VERIFIED',
      eventType: 'EMAIL_VERIFIED',
      category: 'ACCOUNT',
      variables: { userName: candidateUser.fullName },
      actionUrl: '/app/dashboard',
      idempotencyKey: `verify:${candidateUser.id}`,
      awaitEmail: true,
    });

    assert.ok(firstDispatch.inApp?.id);
    assert.ok(firstDispatch.email?.id);
    assert.equal(firstDispatch.email.status, 'SENT');

    // Duplicate call with same idempotencyKey must NOT create duplicate rows
    const duplicateDispatch = await notificationsService.notifyUser({
      recipientId: candidateUser.id,
      recipientEmail: candidateUser.email,
      recipientRole: 'candidate',
      templateKey: 'EMAIL_VERIFIED',
      eventType: 'EMAIL_VERIFIED',
      category: 'ACCOUNT',
      variables: { userName: candidateUser.fullName },
      actionUrl: '/app/dashboard',
      idempotencyKey: `verify:${candidateUser.id}`,
      awaitEmail: true,
    });

    assert.equal(duplicateDispatch.inApp.id, firstDispatch.inApp.id);
    assert.equal(duplicateDispatch.email.id, firstDispatch.email.id);
  });

  // ==========================================================================
  // 2. Recruitment Workflow Notifications (Company -> Job -> Application -> Status)
  // ==========================================================================
  it('2. triggers notifications across company registration, approval, job publishing, and application lifecycle', async () => {
    // Recruiter owner registers a company
    const compRes = await api('POST', '/companies', {
      token: recruiterOwnerToken,
      body: {
        name: 'NovaTech Systems',
        email: 'talent@novatech.test',
        contactNumber: '+91-9887766554',
        website: 'https://novatech.test',
        industry: 'Software & Cloud',
        companySize: '51-200',
        companyType: 'Private Limited',
        foundedYear: 2021,
        country: 'India',
        state: 'Maharashtra',
        city: 'Pune',
        address: 'Baner High Street',
        description: 'Next-generation enterprise cloud platform.',
      },
    });
    assert.equal(compRes.status, 201);
    companyId = compRes.body.data.company.id;

    // Add recruiterMemberUser as a regular RECRUITER member of NovaTech Systems
    await prisma.companyMembership.create({
      data: {
        companyId,
        userId: recruiterMemberUser.id,
        role: 'RECRUITER',
        membershipStatus: 'ACTIVE',
      },
    });

    // Submit company for approval
    const subRes = await api('POST', `/companies/${companyId}/submit`, {
      token: recruiterOwnerToken,
    });
    assert.equal(subRes.status, 200);

    // Admin approves company
    const appCompRes = await api('PATCH', `/admin/companies/${companyId}/approve`, {
      token: superAdminToken,
      body: { reason: 'Verified corporate credentials' },
    });
    assert.equal(appCompRes.status, 200);

    // Recruiter publishes a job
    const jobRes = await api('POST', '/jobs', {
      token: recruiterOwnerToken,
      body: {
        companyId,
        title: 'Lead Platform Architect',
        department: 'Architecture',
        category: 'Software Engineering',
        description: 'Architect scalable multi-region cloud services.',
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'LEAD',
        minExperience: 5,
        maxExperience: 10,
         country: 'India',
        state: 'Maharashtra',
        city: 'Pune',
        numberOfOpenings: 2,
        requiredSkills: ['Node.js', 'PostgreSQL', 'Kubernetes'],
        requireResume: false,
      },
    });
    assert.equal(jobRes.status, 201);
    jobId = jobRes.body.data.job.id;

    // Candidate applies to the job
    const applyRes = await api('POST', '/applications', {
      token: candidateToken,
      body: {
        jobId,
        coverLetter: 'Excited to apply for Lead Platform Architect.',
      },
    });
    assert.equal(applyRes.status, 201);
    applicationId = applyRes.body.data.application.id;

    // Recruiter updates application status to SHORTLISTED -> OFFERED -> HIRED
    const shortlistRes = await api('PATCH', `/applications/recruiter/${applicationId}/status`, {
      token: recruiterOwnerToken,
      body: { status: 'SHORTLISTED', notes: 'Strong profile' },
    });
    assert.equal(shortlistRes.status, 200);

    const offeredRes = await api('PATCH', `/applications/recruiter/${applicationId}/status`, {
      token: recruiterOwnerToken,
      body: { status: 'OFFERED', notes: 'Offer extended' },
    });
    assert.equal(offeredRes.status, 200);

    const hireRes = await api('PATCH', `/applications/recruiter/${applicationId}/status`, {
      token: recruiterOwnerToken,
      body: { status: 'HIRED', notes: 'Offer accepted' },
    });
    assert.equal(hireRes.status, 200);

    // Wait briefly for fire-and-forget notification promises to settle
    await new Promise((r) => setTimeout(r, 150));

    // Verify candidate received in-app notifications for application submission + status updates
    const candNotifs = await api('GET', '/notifications', { token: candidateToken });
    assert.equal(candNotifs.status, 200);
    assert.ok(candNotifs.body.data.notifications.length >= 3);
    assert.ok(candNotifs.body.data.unreadCount >= 3);

    // Verify recruiter received notifications for company approval, job publishing, and new candidate application
    const recNotifs = await api('GET', '/notifications', { token: recruiterOwnerToken });
    assert.equal(recNotifs.status, 200);
    assert.ok(recNotifs.body.data.notifications.length >= 3);
  });

  // ==========================================================================
  // 3. In-App Notification Lifecycle & Strict User Isolation
  // ==========================================================================
  it('3. manages in-app notification read/unread, mark-all-read, dismiss, history, and enforces user isolation', async () => {
    const listRes = await api('GET', '/notifications?limit=10', { token: candidateToken });
    assert.equal(listRes.status, 200);
    const items = listRes.body.data.notifications;
    assert.ok(items.length >= 2);
    const targetNotifId = items[0].id;

    // Second candidate CANNOT read, mark read, or dismiss first candidate's notification
    const crossReadAttempt = await api('GET', `/notifications/${targetNotifId}`, {
      token: secondCandidateToken,
    });
    assert.equal(crossReadAttempt.status, 404);

    const crossPatchAttempt = await api('PATCH', `/notifications/${targetNotifId}/read`, {
      token: secondCandidateToken,
    });
    assert.equal(crossPatchAttempt.status, 404);

    // Candidate marks single notification as read
    const markReadRes = await api('PATCH', `/notifications/${targetNotifId}/read`, {
      token: candidateToken,
    });
    assert.equal(markReadRes.status, 200);
    assert.equal(markReadRes.body.data.notification.isRead, true);
    assert.ok(markReadRes.body.data.notification.readAt);

    // Candidate marks it back as unread
    const markUnreadRes = await api('PATCH', `/notifications/${targetNotifId}/unread`, {
      token: candidateToken,
    });
    assert.equal(markUnreadRes.status, 200);
    assert.equal(markUnreadRes.body.data.notification.isRead, false);

    // Candidate marks all notifications as read
    const markAllRes = await api('PATCH', '/notifications/read-all', {
      token: candidateToken,
      body: { category: 'ALL' },
    });
    assert.equal(markAllRes.status, 200);
    assert.ok(markAllRes.body.data.updatedCount >= 1);

    const unreadAfterAll = await api('GET', '/notifications/unread-count', {
      token: candidateToken,
    });
    assert.equal(unreadAfterAll.status, 200);
    assert.equal(unreadAfterAll.body.data.unreadCount, 0);

    // Candidate dismisses a notification
    const dismissRes = await api('DELETE', `/notifications/${targetNotifId}`, {
      token: candidateToken,
    });
    assert.equal(dismissRes.status, 200);
    assert.equal(dismissRes.body.data.notification.isDismissed, true);

    // Unified Notification History (IN_APP + EMAIL)
    const historyRes = await api('GET', '/notifications/history?channel=ALL', {
      token: candidateToken,
    });
    assert.equal(historyRes.status, 200);
    assert.ok(historyRes.body.data.items.some((i) => i.channel === 'IN_APP'));
    assert.ok(historyRes.body.data.items.some((i) => i.channel === 'EMAIL'));
  });

  // ==========================================================================
  // 4. Notification Preferences & Mandatory Security Guard
  // ==========================================================================
  it('4. manages notification preferences, respects disabled channels, and blocks disabling SECURITY alerts', async () => {
    const prefsRes = await api('GET', '/notifications/preferences', {
      token: candidateToken,
    });
    assert.equal(prefsRes.status, 200);
    assert.ok(Array.isArray(prefsRes.body.data.preferences));

    // Attempt to disable SECURITY category must fail with 400 CANNOT_DISABLE_SECURITY_NOTIFICATIONS
    const disableSecAttempt = await api('PATCH', '/notifications/preferences', {
      token: candidateToken,
      body: {
        preferences: [
          { category: 'SECURITY', channel: 'EMAIL', enabled: false },
        ],
      },
    });
    assert.equal(disableSecAttempt.status, 400);
    assert.equal(disableSecAttempt.body.code, 'CANNOT_DISABLE_SECURITY_NOTIFICATIONS');

    // Disable APPLICATION category for IN_APP channel
    const updatePrefRes = await api('PATCH', '/notifications/preferences', {
      token: candidateToken,
      body: {
        preferences: [
          { category: 'APPLICATION', channel: 'IN_APP', enabled: false },
        ],
      },
    });
    assert.equal(updatePrefRes.status, 200);
    const appPref = updatePrefRes.body.data.preferences.find((p) => p.category === 'APPLICATION');
    assert.equal(appPref.channels.IN_APP, false);
    assert.equal(appPref.channels.EMAIL, true);

    // Dispatch an APPLICATION notification -> IN_APP should be skipped (null), EMAIL should still send
    const prefTestDispatch = await notificationsService.notifyUser({
      recipientId: candidateUser.id,
      recipientEmail: candidateUser.email,
      recipientRole: 'candidate',
      templateKey: 'APPLICATION_SHORTLISTED',
      eventType: 'APPLICATION_SHORTLISTED',
      category: 'APPLICATION',
      variables: {
        candidateName: candidateUser.fullName,
        jobTitle: 'Lead Platform Architect',
        companyName: 'NovaTech Systems',
      },
      awaitEmail: true,
    });
    assert.equal(prefTestDispatch.inApp, null);
    assert.ok(prefTestDispatch.email?.id);
    assert.equal(prefTestDispatch.email.status, 'SENT');
  });

  // ==========================================================================
  // 5. Email Provider Failure Handling & Admin Delivery Retry Monitoring
  // ==========================================================================
  it('5. tracks email provider failures in email_deliveries and supports admin manual retry with audit logging', async () => {
    // Configure custom transport to simulate SMTP outage
    emailService.setCustomTransport(async () => {
      throw new Error('Simulated SMTP connection timeout');
    });

    const failedDelivery = await notificationsService.sendDirectTemplateEmail({
      recipientId: candidateUser.id,
      recipientEmail: candidateUser.email,
      templateKey: 'INTERVIEW_SCHEDULED',
      eventType: 'INTERVIEW_SCHEDULED',
      category: 'INTERVIEW',
      variables: {
        candidateName: candidateUser.fullName,
        jobTitle: 'Lead Platform Architect',
        companyName: 'NovaTech Systems',
        interviewTitle: 'System Design Round',
        scheduledAt: '2026-11-15 10:00 UTC',
        mode: 'VIDEO',
      },
      awaitDelivery: true,
    });

    assert.equal(failedDelivery.status, 'FAILED');
    assert.match(failedDelivery.failureReason, /Simulated SMTP connection timeout/);
    assert.ok(failedDelivery.nextRetryAt);

    // Admin views failed deliveries
    const failedListRes = await api('GET', '/admin/notifications/failed', {
      token: superAdminToken,
    });
    assert.equal(failedListRes.status, 200);
    assert.ok(failedListRes.body.data.deliveries.some((d) => d.id === failedDelivery.id));

    // Restore healthy transport and trigger Admin Manual Retry
    emailService.setCustomTransport(null);

    const retryRes = await api('POST', `/admin/notifications/${failedDelivery.id}/retry`, {
      token: superAdminToken,
    });
    assert.equal(retryRes.status, 200);
    assert.equal(retryRes.body.data.delivery.status, 'SENT');
    assert.equal(retryRes.body.data.delivery.attemptCount, 2);
  });

  // ==========================================================================
  // 6. Role-Scoped Analytics Dashboards (Candidate, Recruiter, Company, Admin)
  // ==========================================================================
  it('6. computes live database analytics for Candidate, Recruiter, Company, and Admin with strict authorization', async () => {
    // Candidate Analytics
    const candAn = await api('GET', '/analytics/candidate?range=30d', {
      token: candidateToken,
    });
    assert.equal(candAn.status, 200);
    assert.equal(candAn.body.data.summary.totalApplications, 1);
    assert.equal(candAn.body.data.summary.offersReceived, 1);
    assert.equal(candAn.body.data.summary.hiredApplications, 1);
    assert.equal(candAn.body.data.conversionRates.hireRate, 100);

    // Candidate CANNOT access Recruiter Analytics
    const candRecAttempt = await api('GET', '/analytics/recruiter', {
      token: candidateToken,
    });
    assert.equal(candRecAttempt.status, 403);

    // Recruiter Analytics
    const recAn = await api('GET', `/analytics/recruiter?range=30d&companyId=${companyId}`, {
      token: recruiterOwnerToken,
    });
    assert.equal(recAn.status, 200);
    assert.equal(recAn.body.data.jobsSummary.totalJobs, 1);
    assert.equal(recAn.body.data.applicationsSummary.totalApplications, 1);
    assert.equal(recAn.body.data.applicationsSummary.candidatesHired, 1);

    // Unrelated Recruiter CANNOT access NovaTech Systems company analytics
    const unrelatedCompAttempt = await api('GET', `/analytics/company/${companyId}`, {
      token: unrelatedRecruiterToken,
    });
    assert.equal(unrelatedCompAttempt.status, 403);

    // Regular company member (RECRUITER role, not OWNER/ADMIN) CANNOT access company-wide analytics
    const memberCompAttempt = await api('GET', `/analytics/company/${companyId}`, {
      token: recruiterMemberToken,
    });
    assert.equal(memberCompAttempt.status, 403);

    // Company OWNER can access Company Analytics
    const compAn = await api('GET', `/analytics/company/${companyId}?range=this_month`, {
      token: recruiterOwnerToken,
    });
    assert.equal(compAn.status, 200);
    assert.equal(compAn.body.data.company.id, companyId);
    assert.equal(compAn.body.data.summary.totalJobs, 1);
    assert.equal(compAn.body.data.summary.totalApplications, 1);
    assert.equal(compAn.body.data.summary.candidatesHired, 1);
    assert.ok(compAn.body.data.summary.totalRecruiters >= 2);
  });

  // ==========================================================================
  // 7. Business Reports Generation, Filtering & Safe CSV / XLSX / JSON Export
  // ==========================================================================
  it('7. generates all 9 report types, enforces role scope, and exports formula-safe CSV, XLSX, and JSON with audit logs', async () => {
    // List available reports for Recruiter vs Admin
    const recCatalog = await api('GET', '/reports', { token: recruiterOwnerToken });
    assert.equal(recCatalog.status, 200);
    assert.equal(recCatalog.body.data.reports.length, 6); // recruiters, companies, jobs, applications, interviews, hiring

    const adminCatalog = await api('GET', '/reports', { token: superAdminToken });
    assert.equal(adminCatalog.status, 200);
    assert.equal(adminCatalog.body.data.reports.length, 9);

    // Recruiter cannot generate admin-only `users` report
    const recUsersReportAttempt = await api('GET', '/reports/users', {
      token: recruiterOwnerToken,
    });
    assert.equal(recUsersReportAttempt.status, 403);

    // Admin generates all 9 report types
    const reportTypes = [
      'users',
      'candidates',
      'recruiters',
      'companies',
      'jobs',
      'applications',
      'interviews',
      'hiring',
      'platform-activity',
    ];

    for (const type of reportTypes) {
      const repRes = await api('GET', `/reports/${type}?range=30d&limit=10`, {
        token: superAdminToken,
      });
      assert.equal(repRes.status, 200, `Report type ${type} should succeed`);
      assert.equal(repRes.body.data.reportType, type);
      assert.ok(Array.isArray(repRes.body.data.columns));
      assert.ok(Array.isArray(repRes.body.data.rows));
    }

    // Export CSV, XLSX, and JSON for applications report
    const csvExport = await api('GET', '/reports/applications/export?format=csv&range=30d', {
      token: superAdminToken,
      raw: true,
    });
    assert.equal(csvExport.status, 200);
    assert.match(csvExport.headers['content-type'], /text\/csv/i);
    assert.match(csvExport.text, /Application ID,Candidate,Job,Company/);
    assert.match(csvExport.text, /Priya Candidate/);

    const xlsxExport = await api('GET', '/reports/applications/export?format=xlsx&range=30d', {
      token: superAdminToken,
      raw: true,
    });
    assert.equal(xlsxExport.status, 200);
    assert.match(xlsxExport.headers['content-type'], /application\/vnd\.ms-excel/i);
    assert.match(xlsxExport.text, /<Workbook/);
    assert.match(xlsxExport.text, /Priya Candidate/);

    const jsonExport = await api('GET', '/reports/applications/export?format=json&range=30d', {
      token: superAdminToken,
    });
    assert.equal(jsonExport.status, 200);
    assert.equal(jsonExport.body.reportType, 'applications');
    assert.equal(jsonExport.body.rows.length, 1);

    // Verify REPORT_EXPORTED was recorded in audit_logs
    const exportLogs = await prisma.auditLog.findMany({
      where: { action: 'REPORT_EXPORTED' },
    });
    assert.ok(exportLogs.length >= 3);
  });
});
