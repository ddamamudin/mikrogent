const bcrypt = require("bcryptjs");
const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

(async () => {
  const password = "9730damamuD";
  const email = "superadmin@lintasagent.com";
  const hashed = await bcrypt.hash(password, 12);

  // Make sure AppConfig singleton exists (Mikroplay flow auto-creates on first request,
  // but for fresh DB we seed explicitly so admin can immediately login + access settings).
  await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", adminSetupEnabled: false }, // disable public setup since we seeded
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "ADMIN",
      adminLevel: "SUPER",
      emailVerified: true,
      validated: true,
      status: "ACTIVE",
    },
    create: {
      name: "Superadmin",
      email,
      password: hashed,
      role: "ADMIN",
      adminLevel: "SUPER",
      emailVerified: true,
      validated: true,
      status: "ACTIVE",
    },
  });

  console.log(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    adminLevel: user.adminLevel,
    validated: user.validated,
    emailVerified: user.emailVerified,
  }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
