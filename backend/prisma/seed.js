import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
const resources = ['PROFILE', 'USER', 'JOB', 'APPLICATION', 'COMPANY'];
const grants = {
  CANDIDATE: ['JOB:READ','APPLICATION:CREATE','APPLICATION:READ','PROFILE:READ','PROFILE:UPDATE'],
  RECRUITER: ['JOB:CREATE','JOB:READ','JOB:UPDATE','APPLICATION:READ','APPLICATION:UPDATE','PROFILE:READ','PROFILE:UPDATE','COMPANY:READ'],
  ADMIN: resources.flatMap(r => actions.map(a => `${r}:${a}`)),
};
try {
  await prisma.$transaction(async tx => {
    for (const name of ['CANDIDATE','RECRUITER','ADMIN']) await tx.role.upsert({where:{name}, update:{}, create:{name, description:`${name} platform role`}});
    for (const resource of resources) for (const action of actions) {
      const name = `${resource}_${action}`;
      await tx.permission.upsert({where:{name}, update:{resource,action}, create:{name,resource,action}});
    }
    for (const [roleName, permissions] of Object.entries(grants)) {
      const role = await tx.role.findUniqueOrThrow({where:{name:roleName}});
      for (const key of permissions) {
        const permission = await tx.permission.findUniqueOrThrow({where:{name:key.replace(':','_')}});
        await tx.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}}, update:{}, create:{roleId:role.id,permissionId:permission.id}});
      }
    }
  });
} finally { await prisma.$disconnect(); }
