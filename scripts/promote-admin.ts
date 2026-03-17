/**
 * Promote a user to ADMIN by email. Run after migrations.
 * Usage: npx tsx scripts/promote-admin.ts <email>
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/promote-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.updateMany({
    where: { email },
    data: { role: "ADMIN" },
  });

  if (user.count === 0) {
    console.error("No user found with email:", email);
    process.exit(1);
  }

  console.log("Promoted to ADMIN:", email);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
