const prisma = require('../../config/prisma');

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  createdAt: true,
};

exports.findFullCandidateData = async (userId, db = prisma) => {
  const [
    user,
    profile,
    resumes,
    skills,
    education,
    experience,
    projects,
    certifications,
    achievements,
    languages,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: safeUserSelect }),
    db.candidateProfile.findUnique({ where: { userId } }),
    db.candidateResume.findMany({
      where: { userId, isDeleted: false },
      orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
      include: {
        _count: { select: { applications: true } },
      },
    }),
    db.candidateSkill.findMany({
      where: { userId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    db.candidateEducation.findMany({
      where: { userId },
      orderBy: [{ currentlyStudying: 'desc' }, { startDate: 'desc' }],
    }),
    db.candidateExperience.findMany({
      where: { userId },
      orderBy: [{ currentlyWorking: 'desc' }, { startDate: 'desc' }],
    }),
    db.candidateProject.findMany({
      where: { userId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    }),
    db.candidateCertification.findMany({
      where: { userId },
      orderBy: [{ issueDate: 'desc' }],
    }),
    db.candidateAchievement.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    db.candidateLanguage.findMany({
      where: { userId },
      orderBy: [{ name: 'asc' }],
    }),
  ]);

  return {
    user,
    profile,
    resumes,
    skills,
    education,
    experience,
    projects,
    certifications,
    achievements,
    languages,
  };
};

exports.upsertProfileWithUser = async (userId, { fullName, ...profileData }, db = prisma) =>
  db.$transaction(async (tx) => {
    if (fullName) {
      await tx.user.update({
        where: { id: userId },
        data: { fullName },
      });
    }
    return tx.candidateProfile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
      include: { user: { select: safeUserSelect } },
    });
  });

// ── Resumes ──────────────────────────────────────────────────────────────

exports.findResumesByUser = (userId, db = prisma) =>
  db.candidateResume.findMany({
    where: { userId, isDeleted: false },
    orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
    include: {
      _count: { select: { applications: true } },
    },
  });

exports.findResumeById = (id, db = prisma) =>
  db.candidateResume.findUnique({
    where: { id },
    include: {
      _count: { select: { applications: true, nextVersions: true } },
    },
  });

exports.findResumeVersionChain = (rootResumeId, userId, db = prisma) =>
  db.candidateResume.findMany({
    where: {
      userId,
      OR: [{ id: rootResumeId }, { rootResumeId }],
    },
    orderBy: { version: 'desc' },
    include: {
      _count: { select: { applications: true } },
    },
  });

exports.createResumeInTransaction = async ({ userId, resumeData, makePrimary }, db = prisma) =>
  db.$transaction(async (tx) => {
    const existingActiveCount = await tx.candidateResume.count({
      where: { userId, isDeleted: false },
    });

    const isPrimary = Boolean(makePrimary || existingActiveCount === 0);

    if (isPrimary) {
      await tx.candidateResume.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await tx.candidateResume.create({
      data: {
        ...resumeData,
        userId,
        isPrimary,
        isLatestVersion: true,
      },
    });

    const updatedWithRoot = await tx.candidateResume.update({
      where: { id: created.id },
      data: { rootResumeId: created.id },
      include: { _count: { select: { applications: true } } },
    });

    if (isPrimary) {
      await tx.candidateProfile.upsert({
        where: { userId },
        create: {
          userId,
          resumeKey: updatedWithRoot.storageKey,
          resumeFileName: updatedWithRoot.originalFileName,
          resumeMimeType: updatedWithRoot.mimeType,
          resumeFileSize: updatedWithRoot.fileSize,
          resumeUpdatedAt: updatedWithRoot.uploadedAt,
        },
        update: {
          resumeKey: updatedWithRoot.storageKey,
          resumeFileName: updatedWithRoot.originalFileName,
          resumeMimeType: updatedWithRoot.mimeType,
          resumeFileSize: updatedWithRoot.fileSize,
          resumeUpdatedAt: updatedWithRoot.uploadedAt,
        },
      });
    }

    return updatedWithRoot;
  });

exports.replaceResumeInTransaction = async (
  { userId, oldResume, newResumeData, makePrimary },
  db = prisma
) =>
  db.$transaction(async (tx) => {
    const shouldBePrimary =
      makePrimary !== undefined ? Boolean(makePrimary) : Boolean(oldResume.isPrimary);
    const rootId = oldResume.rootResumeId || oldResume.id;
    const nextVersionNumber = (oldResume.version || 1) + 1;

    if (shouldBePrimary) {
      await tx.candidateResume.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Mark previous version as superseded (but keep its record & file intact for version history & applications)
    await tx.candidateResume.update({
      where: { id: oldResume.id },
      data: {
        isLatestVersion: false,
        isPrimary: false,
      },
    });

    const created = await tx.candidateResume.create({
      data: {
        ...newResumeData,
        userId,
        title: newResumeData.title || oldResume.title,
        version: nextVersionNumber,
        rootResumeId: rootId,
        previousVersionId: oldResume.id,
        isLatestVersion: true,
        isPrimary: shouldBePrimary,
      },
      include: { _count: { select: { applications: true } } },
    });

    if (shouldBePrimary) {
      await tx.candidateProfile.upsert({
        where: { userId },
        create: {
          userId,
          resumeKey: created.storageKey,
          resumeFileName: created.originalFileName,
          resumeMimeType: created.mimeType,
          resumeFileSize: created.fileSize,
          resumeUpdatedAt: created.uploadedAt,
        },
        update: {
          resumeKey: created.storageKey,
          resumeFileName: created.originalFileName,
          resumeMimeType: created.mimeType,
          resumeFileSize: created.fileSize,
          resumeUpdatedAt: created.uploadedAt,
        },
      });
    }

    return created;
  });

exports.setPrimaryResumeInTransaction = async ({ userId, resume }, db = prisma) =>
  db.$transaction(async (tx) => {
    await tx.candidateResume.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });

    const updated = await tx.candidateResume.update({
      where: { id: resume.id },
      data: { isPrimary: true },
      include: { _count: { select: { applications: true } } },
    });

    await tx.candidateProfile.upsert({
      where: { userId },
      create: {
        userId,
        resumeKey: updated.storageKey,
        resumeFileName: updated.originalFileName,
        resumeMimeType: updated.mimeType,
        resumeFileSize: updated.fileSize,
        resumeUpdatedAt: updated.uploadedAt,
      },
      update: {
        resumeKey: updated.storageKey,
        resumeFileName: updated.originalFileName,
        resumeMimeType: updated.mimeType,
        resumeFileSize: updated.fileSize,
        resumeUpdatedAt: updated.uploadedAt,
      },
    });

    return updated;
  });

exports.softDeleteResumeInTransaction = async ({ userId, resume }, db = prisma) =>
  db.$transaction(async (tx) => {
    await tx.candidateResume.update({
      where: { id: resume.id },
      data: {
        isDeleted: true,
        isPrimary: false,
      },
    });

    if (resume.isPrimary) {
      const nextPrimary = await tx.candidateResume.findFirst({
        where: { userId, isDeleted: false, isLatestVersion: true },
        orderBy: { uploadedAt: 'desc' },
      });

      if (nextPrimary) {
        await tx.candidateResume.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
        await tx.candidateProfile.updateMany({
          where: { userId },
          data: {
            resumeKey: nextPrimary.storageKey,
            resumeFileName: nextPrimary.originalFileName,
            resumeMimeType: nextPrimary.mimeType,
            resumeFileSize: nextPrimary.fileSize,
            resumeUpdatedAt: nextPrimary.uploadedAt,
          },
        });
      } else {
        await tx.candidateProfile.updateMany({
          where: { userId },
          data: {
            resumeKey: null,
            resumeFileName: null,
            resumeMimeType: null,
            resumeFileSize: null,
            resumeUpdatedAt: null,
          },
        });
      }
    }
  });

// ── Skills ───────────────────────────────────────────────────────────────

exports.findSkillsByUser = (userId, db = prisma) =>
  db.candidateSkill.findMany({
    where: { userId },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

exports.findSkillById = (id, db = prisma) =>
  db.candidateSkill.findUnique({ where: { id } });

exports.syncProfileSkillNames = async (userId, tx = prisma) => {
  const allSkills = await tx.candidateSkill.findMany({
    where: { userId },
    select: { name: true },
    orderBy: { name: 'asc' },
  });
  const names = allSkills.map((s) => s.name);
  await tx.candidateProfile.upsert({
    where: { userId },
    create: { userId, skills: names },
    update: { skills: names },
  });
  return names;
};

exports.upsertSkillsBatch = async (userId, skillItems, db = prisma) =>
  db.$transaction(async (tx) => {
    const results = [];
    for (const item of skillItems) {
      const normalizedName = item.name.trim().toLowerCase();
      const saved = await tx.candidateSkill.upsert({
        where: {
          userId_normalizedName: {
            userId,
            normalizedName,
          },
        },
        create: {
          userId,
          name: item.name.trim(),
          normalizedName,
          category: item.category || 'Technical',
          experienceYears: item.experienceYears ?? null,
          proficiencyLevel: item.proficiencyLevel || null,
          lastUsed: item.lastUsed || null,
          source: 'MANUAL',
        },
        update: {
          name: item.name.trim(),
          category: item.category || 'Technical',
          experienceYears: item.experienceYears ?? null,
          proficiencyLevel: item.proficiencyLevel || null,
          lastUsed: item.lastUsed || null,
        },
      });
      results.push(saved);
    }

    await exports.syncProfileSkillNames(userId, tx);
    return results;
  });

exports.updateSkillById = async (userId, id, data, db = prisma) =>
  db.$transaction(async (tx) => {
    const updatePayload = { ...data };
    if (data.name) {
      updatePayload.name = data.name.trim();
      updatePayload.normalizedName = data.name.trim().toLowerCase();
    }
    const updated = await tx.candidateSkill.update({
      where: { id },
      data: updatePayload,
    });
    await exports.syncProfileSkillNames(userId, tx);
    return updated;
  });

exports.deleteSkillById = async (userId, id, db = prisma) =>
  db.$transaction(async (tx) => {
    await tx.candidateSkill.delete({ where: { id } });
    await exports.syncProfileSkillNames(userId, tx);
  });

exports.findSkillSuggestions = async (query = '', db = prisma) => {
  const rows = await db.candidateSkill.findMany({
    where: query
      ? {
          name: { contains: query, mode: 'insensitive' },
        }
      : {},
    distinct: ['normalizedName'],
    select: { name: true, category: true },
    take: 20,
    orderBy: { name: 'asc' },
  });
  return rows;
};

// ── Education ────────────────────────────────────────────────────────────

exports.findEducationByUser = (userId, db = prisma) =>
  db.candidateEducation.findMany({
    where: { userId },
    orderBy: [{ currentlyStudying: 'desc' }, { startDate: 'desc' }],
  });

exports.findEducationById = (id, db = prisma) =>
  db.candidateEducation.findUnique({ where: { id } });

exports.createEducation = (userId, data, db = prisma) =>
  db.candidateEducation.create({
    data: {
      ...data,
      userId,
      endDate: data.currentlyStudying ? null : data.endDate || null,
    },
  });

exports.updateEducation = (id, data, db = prisma) =>
  db.candidateEducation.update({
    where: { id },
    data: {
      ...data,
      endDate: data.currentlyStudying ? null : data.endDate || null,
    },
  });

exports.deleteEducation = (id, db = prisma) =>
  db.candidateEducation.delete({ where: { id } });

// ── Work Experience ──────────────────────────────────────────────────────

exports.findExperienceByUser = (userId, db = prisma) =>
  db.candidateExperience.findMany({
    where: { userId },
    orderBy: [{ currentlyWorking: 'desc' }, { startDate: 'desc' }],
  });

exports.findExperienceById = (id, db = prisma) =>
  db.candidateExperience.findUnique({ where: { id } });

exports.createExperience = (userId, data, db = prisma) =>
  db.candidateExperience.create({
    data: {
      ...data,
      userId,
      endDate: data.currentlyWorking ? null : data.endDate || null,
    },
  });

exports.updateExperience = (id, data, db = prisma) =>
  db.candidateExperience.update({
    where: { id },
    data: {
      ...data,
      endDate: data.currentlyWorking ? null : data.endDate || null,
    },
  });

exports.deleteExperience = (id, db = prisma) =>
  db.candidateExperience.delete({ where: { id } });

// ── Projects ─────────────────────────────────────────────────────────────

exports.findProjectsByUser = (userId, db = prisma) =>
  db.candidateProject.findMany({
    where: { userId },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });

exports.findProjectById = (id, db = prisma) =>
  db.candidateProject.findUnique({ where: { id } });

exports.createProject = (userId, data, db = prisma) =>
  db.candidateProject.create({ data: { ...data, userId } });

exports.updateProject = (id, data, db = prisma) =>
  db.candidateProject.update({ where: { id }, data });

exports.deleteProject = (id, db = prisma) =>
  db.candidateProject.delete({ where: { id } });

// ── Certifications ───────────────────────────────────────────────────────

exports.findCertificationsByUser = (userId, db = prisma) =>
  db.candidateCertification.findMany({
    where: { userId },
    orderBy: [{ issueDate: 'desc' }],
  });

exports.findCertificationById = (id, db = prisma) =>
  db.candidateCertification.findUnique({ where: { id } });

exports.createCertification = (userId, data, db = prisma) =>
  db.candidateCertification.create({ data: { ...data, userId } });

exports.updateCertification = (id, data, db = prisma) =>
  db.candidateCertification.update({ where: { id }, data });

exports.deleteCertification = (id, db = prisma) =>
  db.candidateCertification.delete({ where: { id } });

// ── Achievements ─────────────────────────────────────────────────────────

exports.findAchievementsByUser = (userId, db = prisma) =>
  db.candidateAchievement.findMany({
    where: { userId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

exports.findAchievementById = (id, db = prisma) =>
  db.candidateAchievement.findUnique({ where: { id } });

exports.createAchievement = (userId, data, db = prisma) =>
  db.candidateAchievement.create({ data: { ...data, userId } });

exports.updateAchievement = (id, data, db = prisma) =>
  db.candidateAchievement.update({ where: { id }, data });

exports.deleteAchievement = (id, db = prisma) =>
  db.candidateAchievement.delete({ where: { id } });

// ── Languages ────────────────────────────────────────────────────────────

exports.findLanguagesByUser = (userId, db = prisma) =>
  db.candidateLanguage.findMany({
    where: { userId },
    orderBy: [{ name: 'asc' }],
  });

exports.findLanguageById = (id, db = prisma) =>
  db.candidateLanguage.findUnique({ where: { id } });

exports.upsertLanguage = (userId, data, db = prisma) =>
  db.candidateLanguage.upsert({
    where: {
      userId_name: {
        userId,
        name: data.name.trim(),
      },
    },
    create: {
      userId,
      name: data.name.trim(),
      proficiencyLevel: data.proficiencyLevel,
    },
    update: {
      proficiencyLevel: data.proficiencyLevel,
    },
  });

exports.updateLanguage = (id, data, db = prisma) =>
  db.candidateLanguage.update({
    where: { id },
    data: {
      name: data.name.trim(),
      proficiencyLevel: data.proficiencyLevel,
    },
  });

exports.deleteLanguage = (id, db = prisma) =>
  db.candidateLanguage.delete({ where: { id } });
