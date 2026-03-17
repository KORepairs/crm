import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const password = await bcrypt.hash("AriaAmber21*", 10)

  await prisma.user.upsert({
    where: { email: "admin@crm.local" },
    update: {},
    create: {
        name: "Admin",
        email: "admin@crm.local",
        passwordHash: password,
        role: "admin",
        },

  });

  await prisma.user.upsert({
  where: { email: "sales@crm.local" },
  update: {},
  create: {
    email: "sales@crm.local",
    name: "Sales User",
    passwordHash: password,
    role: "sales",
  },
});

  console.log("Admin user created");
}

main().finally(() => prisma.$disconnect());
