'use strict';

// require('dotenv').config();
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const USERS_TO_SEED = [
  {
    email: 'superadmin@recruitro.test',
    password: 'SuperPassword#2026',
    fullName: 'Platform Super Admin',
    adminRole: 'SUPER_ADMIN',
  },
  {
    email: 'jobapprover@recruitro.test',
    password: 'ApproverPass#2026',
    fullName: 'Job Approval Officer',
    adminRole: 'JOB_APPROVER',
  },
  {
    email: 'support@recruitro.test',
    password: 'SupportPass#2026',
    fullName: 'Support Administrator',
    adminRole: 'SUPPORT_ADMIN',
  },
  {
    email: 'super2@recruitro.test',
    password: 'SuperPassword#2026',
    fullName: 'Second Super Admin',
    adminRole: 'SUPER_ADMIN',
  },
];

async function seedAdminUsers() {
  console.log('--- Seeding Admin Users ---');
  const now = new Date();

  for (const item of USERS_TO_SEED) {
    const cleanEmail = item.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(item.password, 12);

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: item.fullName,
          passwordHash,
          role: 'admin',
          adminRole: item.adminRole,
          status: 'active',
          emailVerifiedAt: existing.emailVerifiedAt || now,
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
          statusChangedAt: now,
        },
      });
      console.log(`Updated user ${cleanEmail} -> Role: admin, AdminRole: ${item.adminRole}`);
    } else {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          fullName: item.fullName,
          passwordHash,
          role: 'admin',
          adminRole: item.adminRole,
          status: 'active',
          emailVerifiedAt: now,
          statusChangedAt: now,
        },
      });
      console.log(`Created user ${cleanEmail} -> Role: admin, AdminRole: ${item.adminRole}`);
    }

    // Record role history
    try {
      await prisma.adminRoleHistory.create({
        data: {
          userId: user.id,
          changeType: existing ? 'ROLE' : 'CREATED',
          previousRole: existing?.adminRole || null,
          newRole: item.adminRole,
          changedBy: user.id,
          reason: 'Initial seed for role UI testing',
        },
      });
    } catch (e) {
      // Ignore if history fails
    }
  }

  console.log('All 4 admin accounts are ready!');
}

if (require.main === module) {
  seedAdminUsers()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Failed to seed admin users:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedAdminUsers };
