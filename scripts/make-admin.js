const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: "yoad@tumba.net" },
    data: { isAdmin: true },
  });
  console.log("Updated:", result.count, "users");

  const users = await prisma.user.findMany({
    select: { name: true, email: true, isAdmin: true },
  });
  console.log("All users:", JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
