const prisma = require('../../config/prisma');

const safeUserSelect = {
    id: true,
    email: true,
    fullName: true,
    role: true,
};

exports.findUserById = (userId, db = prisma) => db.user.findUnique({
    where: {id: userId},
    select: safeUserSelect,
});

// candidate
exports.findCandidateById = (userId, db = prisma) => db.candidateProfile.findUnique({
    where: {userId},
    include: {user: {select: safeUserSelect}},
});
// upsert : creates on first save, updates afterwards
exports.upsertCandidate = (userId, data, db = prisma) => db.candidateProfile.upsert({
    where: {userId},
    create: {userId, ...data},
    update: data,
    include: {user: {select: safeUserSelect}},
});
// Recruiter
exports.findRecruiterById = (userId, db = prisma) => db.recruiterProfile.findUnique({
    where: {userId},
    include: {company: true, user: {select: safeUserSelect}},
});
exports.findRecruiterByUserId = (userId, db = prisma) => db.recruiterProfile.findUnique({
    where: {userId},
    include: {company: true, user: {select: safeUserSelect}},
});
exports.upsertRecruiter = (userId, data, db = prisma) => db.recruiterProfile.upsert({
    where: {userId},
    create: {userId, ...data},
    update: data,
    include: {company: true, user: {select: safeUserSelect}},
});
// update userName
exports.updateUserName = (userId, fullName, db = prisma) => db.user.update({
    where: {id: userId},
    data: {fullName}
});

// company
exports.findCompanyById = (companyId, db = prisma) => db.company.findUnique({where: {id: companyId}});
exports.createCompany = (data, db = prisma) => db.company.create({data});
exports.updateCompany = (companyId, data, db = prisma) => db.company.update({where: {id: companyId}, data});
exports.searchCompanies = (query, db = prisma) => db.company.findMany({
    where: query ? {name: {contains: query, mode: 'insensitive'}} : {},
    orderBy: {name: 'asc'},
    take: 20
});
