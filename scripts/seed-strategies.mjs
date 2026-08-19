import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const defaults = [
  {
    type: "DAY",
    name: "Day Strategy",
    description: "Short-term strategy",
    minAmount: 100,
    maxAmount: 10000,
    minDays: 1,
    maxDays: 7,
    baseMinPercent: 0.5,
    baseMaxPercent: 1.5,
    allowMultiplier: false,
    accentColor: "#4F46E5",
  },
  {
    type: "WEEK",
    name: "Week Strategy",
    description: "Medium-term strategy",
    minAmount: 500,
    maxAmount: 50000,
    minDays: 7,
    maxDays: 30,
    baseMinPercent: 1.0,
    baseMaxPercent: 2.5,
    allowMultiplier: true,
    accentColor: "#059669",
  },
  {
    type: "MONTH",
    name: "Month Strategy",
    description: "Long-term strategy",
    minAmount: 1000,
    maxAmount: 100000,
    minDays: 30,
    maxDays: 90,
    baseMinPercent: 2.0,
    baseMaxPercent: 5.0,
    allowMultiplier: true,
    accentColor: "#D97706",
  },
];

async function main() {
  const count = await db.strategyConfig.count();
  if (count > 0) {
    console.log(`Strategies already seeded (${count})`);
    return;
  }

  for (const s of defaults) {
    await db.strategyConfig.create({ data: s });
    console.log("Created", s.type);
  }
  console.log("Done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
