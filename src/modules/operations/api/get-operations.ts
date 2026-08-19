"use server";

import { getServerSession } from "@/shared/lib/auth";
import { getOperations } from "../lib/operations-service";

export async function getOperationsAction() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Необходима авторизация",
    };
  }

  try {
    const operations = await getOperations(session.user.id);
    return {
      success: true,
      operations,
    };
  } catch (error) {
    console.error("Get operations error:", error);
    return {
      error: "Не удалось загрузить операции",
    };
  }
}
