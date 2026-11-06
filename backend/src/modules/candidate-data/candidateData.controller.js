const asyncHandler = require('../../utils/asyncHandler');
const service = require('./candidateData.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ── Profile & Completion ─────────────────────────────────────────────────

exports.getProfile = asyncHandler(async (req, res) => {
  const result = await service.getFullCandidateProfile(req.user.id);
  ok(res, result);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const result = await service.updateCandidateProfile(req.user.id, req.body);
  ok(res, { ...result, message: 'Candidate profile updated successfully.' });
});

exports.getCompletion = asyncHandler(async (req, res) => {
  const completion = await service.getProfileCompletion(req.user.id);
  ok(res, { completion });
});

// ── Resumes ──────────────────────────────────────────────────────────────

exports.listResumes = asyncHandler(async (req, res) => {
  const result = await service.listMyResumes(req.user.id);
  ok(res, result);
});

exports.uploadResume = asyncHandler(async (req, res) => {
  const resume = await service.uploadResume(req.user.id, req.body);
  ok(res, { resume, message: 'Resume uploaded successfully.' }, 201);
});

exports.getResumeDetails = asyncHandler(async (req, res) => {
  const result = await service.getResumeDetails(req.user.id, req.params.id);
  ok(res, result);
});

exports.setPrimaryResume = asyncHandler(async (req, res) => {
  const resume = await service.setPrimaryResume(req.user.id, req.params.id);
  ok(res, { resume, message: 'Primary resume updated.' });
});

exports.replaceResume = asyncHandler(async (req, res) => {
  const result = await service.replaceResume(req.user.id, req.params.id, req.body);
  ok(res, { ...result, message: 'New resume version uploaded.' });
});

exports.deleteResume = asyncHandler(async (req, res) => {
  await service.deleteResume(req.user.id, req.params.id);
  ok(res, { message: 'Resume deleted successfully.' });
});

exports.downloadResume = asyncHandler(async (req, res) => {
  const { buffer, mimeType, fileName } = await service.getCandidateResumeDownloadStream(
    req.user.id,
    req.params.id
  );
  const disposition = req.query.download === 'false' ? 'inline' : 'attachment';
  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${encodeURIComponent(fileName)}"`
  );
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

// ── Skills ───────────────────────────────────────────────────────────────

exports.listSkills = asyncHandler(async (req, res) => {
  const result = await service.listSkills(req.user.id, {
    suggestions: req.query.suggestions,
  });
  ok(res, result);
});

exports.addSkills = asyncHandler(async (req, res) => {
  const skills = await service.addSkills(req.user.id, req.body);
  ok(res, { skills, message: 'Skills saved successfully.' }, 201);
});

exports.updateSkill = asyncHandler(async (req, res) => {
  const skill = await service.updateSkill(req.user.id, req.params.id, req.body);
  ok(res, { skill, message: 'Skill updated.' });
});

exports.deleteSkill = asyncHandler(async (req, res) => {
  await service.deleteSkill(req.user.id, req.params.id);
  ok(res, { message: 'Skill removed.' });
});

// ── Education ────────────────────────────────────────────────────────────

exports.listEducation = asyncHandler(async (req, res) => {
  const education = await service.listEducation(req.user.id);
  ok(res, { education });
});

exports.addEducation = asyncHandler(async (req, res) => {
  const education = await service.addEducation(req.user.id, req.body);
  ok(res, { education, message: 'Education record added.' }, 201);
});

exports.updateEducation = asyncHandler(async (req, res) => {
  const education = await service.updateEducation(req.user.id, req.params.id, req.body);
  ok(res, { education, message: 'Education record updated.' });
});

exports.deleteEducation = asyncHandler(async (req, res) => {
  await service.deleteEducation(req.user.id, req.params.id);
  ok(res, { message: 'Education record deleted.' });
});

// ── Work Experience ──────────────────────────────────────────────────────

exports.listExperience = asyncHandler(async (req, res) => {
  const result = await service.listExperience(req.user.id);
  ok(res, result);
});

exports.addExperience = asyncHandler(async (req, res) => {
  const result = await service.addExperience(req.user.id, req.body);
  ok(res, { ...result, message: 'Work experience added.' }, 201);
});

exports.updateExperience = asyncHandler(async (req, res) => {
  const result = await service.updateExperience(req.user.id, req.params.id, req.body);
  ok(res, { ...result, message: 'Work experience updated.' });
});

exports.deleteExperience = asyncHandler(async (req, res) => {
  const result = await service.deleteExperience(req.user.id, req.params.id);
  ok(res, { ...result, message: 'Work experience deleted.' });
});

// ── Projects ─────────────────────────────────────────────────────────────

exports.listProjects = asyncHandler(async (req, res) => {
  const projects = await service.listProjects(req.user.id);
  ok(res, { projects });
});

exports.addProject = asyncHandler(async (req, res) => {
  const project = await service.addProject(req.user.id, req.body);
  ok(res, { project, message: 'Project added.' }, 201);
});

exports.updateProject = asyncHandler(async (req, res) => {
  const project = await service.updateProject(req.user.id, req.params.id, req.body);
  ok(res, { project, message: 'Project updated.' });
});

exports.deleteProject = asyncHandler(async (req, res) => {
  await service.deleteProject(req.user.id, req.params.id);
  ok(res, { message: 'Project deleted.' });
});

// ── Certifications ───────────────────────────────────────────────────────

exports.listCertifications = asyncHandler(async (req, res) => {
  const certifications = await service.listCertifications(req.user.id);
  ok(res, { certifications });
});

exports.addCertification = asyncHandler(async (req, res) => {
  const certification = await service.addCertification(req.user.id, req.body);
  ok(res, { certification, message: 'Certification added.' }, 201);
});

exports.updateCertification = asyncHandler(async (req, res) => {
  const certification = await service.updateCertification(req.user.id, req.params.id, req.body);
  ok(res, { certification, message: 'Certification updated.' });
});

exports.deleteCertification = asyncHandler(async (req, res) => {
  await service.deleteCertification(req.user.id, req.params.id);
  ok(res, { message: 'Certification deleted.' });
});

// ── Achievements ─────────────────────────────────────────────────────────

exports.listAchievements = asyncHandler(async (req, res) => {
  const achievements = await service.listAchievements(req.user.id);
  ok(res, { achievements });
});

exports.addAchievement = asyncHandler(async (req, res) => {
  const achievement = await service.addAchievement(req.user.id, req.body);
  ok(res, { achievement, message: 'Achievement added.' }, 201);
});

exports.updateAchievement = asyncHandler(async (req, res) => {
  const achievement = await service.updateAchievement(req.user.id, req.params.id, req.body);
  ok(res, { achievement, message: 'Achievement updated.' });
});

exports.deleteAchievement = asyncHandler(async (req, res) => {
  await service.deleteAchievement(req.user.id, req.params.id);
  ok(res, { message: 'Achievement deleted.' });
});

// ── Languages ────────────────────────────────────────────────────────────

exports.listLanguages = asyncHandler(async (req, res) => {
  const languages = await service.listLanguages(req.user.id);
  ok(res, { languages });
});

exports.addLanguage = asyncHandler(async (req, res) => {
  const language = await service.addLanguage(req.user.id, req.body);
  ok(res, { language, message: 'Language saved.' }, 201);
});

exports.updateLanguage = asyncHandler(async (req, res) => {
  const language = await service.updateLanguage(req.user.id, req.params.id, req.body);
  ok(res, { language, message: 'Language updated.' });
});

exports.deleteLanguage = asyncHandler(async (req, res) => {
  await service.deleteLanguage(req.user.id, req.params.id);
  ok(res, { message: 'Language deleted.' });
});
