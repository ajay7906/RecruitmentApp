const router = require('express').Router();
const c = require('./candidateData.controller');
const v = require('./candidateData.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);
router.use(requireRole('candidate'));

// Candidate Profile & Completion
router.get('/profile', c.getProfile);
router.put('/profile', validate(v.updateProfile), c.updateProfile);
router.get('/profile/completion', c.getCompletion);

// Resumes Management
router.get('/resumes', c.listResumes);
router.post('/resumes', validate(v.uploadResume), c.uploadResume);
router.get('/resumes/:id', validate(v.idParam), c.getResumeDetails);
router.get('/resumes/:id/download', validate(v.idParam), c.downloadResume);
router.patch('/resumes/:id/primary', validate(v.idParam), c.setPrimaryResume);
router.put('/resumes/:id', validate(v.replaceResume), c.replaceResume);
router.delete('/resumes/:id', validate(v.idParam), c.deleteResume);

// Structured Skills
router.get('/skills', c.listSkills);
router.post('/skills', validate(v.createSkill), c.addSkills);
router.put('/skills/:id', validate(v.updateSkill), c.updateSkill);
router.delete('/skills/:id', validate(v.idParam), c.deleteSkill);

// Education
router.get('/education', c.listEducation);
router.post('/education', validate(v.createEducation), c.addEducation);
router.put('/education/:id', validate(v.updateEducation), c.updateEducation);
router.delete('/education/:id', validate(v.idParam), c.deleteEducation);

// Work Experience
router.get('/experience', c.listExperience);
router.post('/experience', validate(v.createExperience), c.addExperience);
router.put('/experience/:id', validate(v.updateExperience), c.updateExperience);
router.delete('/experience/:id', validate(v.idParam), c.deleteExperience);

// Projects
router.get('/projects', c.listProjects);
router.post('/projects', validate(v.createProject), c.addProject);
router.put('/projects/:id', validate(v.updateProject), c.updateProject);
router.delete('/projects/:id', validate(v.idParam), c.deleteProject);

// Certifications
router.get('/certifications', c.listCertifications);
router.post('/certifications', validate(v.createCertification), c.addCertification);
router.put('/certifications/:id', validate(v.updateCertification), c.updateCertification);
router.delete('/certifications/:id', validate(v.idParam), c.deleteCertification);

// Achievements
router.get('/achievements', c.listAchievements);
router.post('/achievements', validate(v.createAchievement), c.addAchievement);
router.put('/achievements/:id', validate(v.updateAchievement), c.updateAchievement);
router.delete('/achievements/:id', validate(v.idParam), c.deleteAchievement);

// Languages
router.get('/languages', c.listLanguages);
router.post('/languages', validate(v.createLanguage), c.addLanguage);
router.put('/languages/:id', validate(v.updateLanguage), c.updateLanguage);
router.delete('/languages/:id', validate(v.idParam), c.deleteLanguage);

module.exports = router;
