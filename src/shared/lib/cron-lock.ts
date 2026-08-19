import { db } from "@/shared/lib/db";

function lockKeyFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  // pg advisory lock uses signed int4 for single-key API
  return hash === 0 ? 1 : hash;
}

export async function withCronLock<T>(
  jobName: string,
  fn: () => Promise<T>
): Promise<{ acquired: boolean; result?: T }> {
  const key = lockKeyFromName(`axon:${jobName}`);
  const lockRows = await db.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(${key}) AS locked
  `;
  const acquired = !!lockRows[0]?.locked;
  if (!acquired) {
    return { acquired: false };
  }

  try {
    const result = await fn();
    return { acquired: true, result };
  } finally {
    await db.$queryRaw`SELECT pg_advisory_unlock(${key})`;
  }
}

