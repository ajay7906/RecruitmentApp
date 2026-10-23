
const completionFields = [
  (p) => Boolean(p.fullName?.trim()),
  (p) => Boolean(p.phone?.trim()),
  (p) => Boolean(p.dateOfBirth),
  (p) => Boolean(p.gender),
  (p) => Boolean(p.headline?.trim()),
  (p) => Boolean(p.bio?.trim()),
  (p) => Boolean(p.location?.trim()),
  (p) => Boolean(p.city?.trim()),
  (p) => Boolean(p.state?.trim()),
  (p) => Boolean(p.country?.trim()),
  (p) => p.yearsOfExperience !== null &&
         p.yearsOfExperience !== undefined &&
         p.yearsOfExperience !== "",
  (p) => Boolean(p.currentJobTitle?.trim()),
  (p) => Boolean(p.currentCompany?.trim()),
  (p) => Boolean(p.linkedinUrl?.trim()),
  (p) => Boolean(p.githubUrl?.trim()),
  (p) => Boolean(p.portfolioUrl?.trim()),
];

export function calculateProfileCompletion(profile = {}) {
  const total = completionFields.length;

  const completed = completionFields.filter(
    (isComplete) => isComplete(profile)
  ).length;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}
