/**
 * Seed demo news posts for AXON (idempotent).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DEMO_MARKER = "[DEMO]";

const showcasePosts = [
  {
    title: "",
    content: `${DEMO_MARKER} Text-only post — Bondex strategies are now live on the platform.`,
    type: "TEXT",
    coverUrl: null,
    youtubeUrl: null,
  },
  {
    title: "Weekly market outlook",
    content: `${DEMO_MARKER} AI models and expert traders reviewed macro trends for the week ahead.`,
    type: "TEXT",
    coverUrl: null,
    youtubeUrl: null,
  },
  {
    title: "",
    content: null,
    type: "IMAGE",
    coverUrl: "/logo.svg",
    youtubeUrl: null,
  },
  {
    title: "AXON ecosystem",
    content: `${DEMO_MARKER} Image with caption — four markets united in one sustainable system.`,
    type: "IMAGE",
    coverUrl: "/logo.svg",
    youtubeUrl: null,
  },
  {
    title: "",
    content: null,
    type: "VIDEO",
    coverUrl: null,
    youtubeUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  },
  {
    title: "Platform walkthrough",
    content: `${DEMO_MARKER} Video with caption — see how daily accruals work in your terminal.`,
    type: "VIDEO",
    coverUrl: null,
    youtubeUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  },
];

async function main() {
  const existing = await db.post.count({
    where: { content: { contains: DEMO_MARKER } },
  });

  if (existing >= 6) {
    console.log(`Demo posts already exist (${existing} found). Skipping.`);
    return;
  }

  const now = Date.now();

  for (let i = 0; i < showcasePosts.length; i++) {
    const p = showcasePosts[i];
    await db.post.create({
      data: {
        title: p.title,
        content: p.content,
        coverUrl: p.coverUrl,
        youtubeUrl: p.youtubeUrl,
        type: p.type,
        isPublished: true,
        createdAt: new Date(now - (showcasePosts.length - i) * 60_000),
      },
    });
    console.log(`Created ${p.type} demo post`);
  }

  for (let n = 1; n <= 12; n++) {
    await db.post.create({
      data: {
        title: `News update #${n}`,
        content: `${DEMO_MARKER} Scroll test post ${n} — AXON news feed pagination.`,
        type: "TEXT",
        isPublished: true,
        createdAt: new Date(now - (showcasePosts.length + n) * 60_000),
      },
    });
  }

  console.log("Created 18 demo posts total.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
