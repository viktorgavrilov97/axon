/**
 * Script to generate referral codes for existing users who don't have one
 * Run with: npx tsx scripts/generate-referral-codes.ts
 */

import { PrismaClient } from "@prisma/client";
import { generateReferralCode } from "../src/shared/lib/referral-code";

const prisma = new PrismaClient();

async function main() {
  console.log("Generating referral codes for users without codes...");

  // Find all users without referral codes
  const usersWithoutCodes = await prisma.user.findMany({
    where: {
      referralCode: null,
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`Found ${usersWithoutCodes.length} users without referral codes`);

  let generated = 0;
  let errors = 0;

  for (const user of usersWithoutCodes) {
    try {
      let referralCode: string;
      let attempts = 0;
      const maxAttempts = 10;

      // Generate unique referral code
      do {
        referralCode = generateReferralCode();
        attempts++;

        // Check if code already exists
        const existing = await prisma.user.findUnique({
          where: { referralCode },
          select: { id: true },
        });

        if (!existing) {
          break; // Code is unique
        }

        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
        }
      } while (true);

      // Update user with referral code
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });

      generated++;
      console.log(`✓ Generated code ${referralCode} for user ${user.email}`);
    } catch (error) {
      errors++;
      console.error(`✗ Failed to generate code for user ${user.email}:`, error);
    }
  }

  console.log(`\nCompleted:`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Errors: ${errors}`);
}

main()
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

