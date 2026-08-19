// Load environment variables from .env.local
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = cleanValue;
        }
      }
    }
  });
} catch (e) {
  console.error("Failed to load .env.local:", e);
  process.exit(1);
}

import { db } from "../src/shared/lib/db";
import { StrategyStatus } from "@prisma/client";

async function main() {
  try {
    console.log("Fixing strategy endDates (converting days to minutes)...");
    
    const activeStrategies = await db.strategy.findMany({
      where: { status: StrategyStatus.ACTIVE },
    });

    console.log(`Found ${activeStrategies.length} active strategies`);

    for (const strategy of activeStrategies) {
      const startDate = new Date(strategy.startDate);
      const currentEndDate = new Date(strategy.endDate);
      
      // Calculate what endDate should be (startDate + durationDays minutes)
      const correctEndDate = new Date(startDate);
      correctEndDate.setMinutes(correctEndDate.getMinutes() + strategy.durationDays);
      
      // Check if endDate needs to be fixed
      const diff = Math.abs(currentEndDate.getTime() - correctEndDate.getTime());
      const diffMinutes = diff / (1000 * 60);
      
      // If difference is more than 1 minute, it was set with old logic (days)
      if (diffMinutes > 1) {
        console.log(`\nStrategy ${strategy.id}:`);
        console.log(`  Current endDate: ${currentEndDate.toISOString()}`);
        console.log(`  Correct endDate: ${correctEndDate.toISOString()}`);
        console.log(`  Duration: ${strategy.durationDays} minutes`);
        
        await db.strategy.update({
          where: { id: strategy.id },
          data: { endDate: correctEndDate },
        });
        
        console.log(`  ✅ Fixed!`);
      } else {
        console.log(`Strategy ${strategy.id}: Already correct`);
      }
    }

    console.log("\n✅ All strategies fixed!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();


