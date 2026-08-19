import { auth } from "@/modules/identity/lib/auth";
import { db } from "./db";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return await db.user.findUnique({
    where: { email: session.user.email },
  });
}

export async function getServerSession() {
  return await auth();
}

