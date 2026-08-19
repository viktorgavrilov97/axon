"use server";

import { getServerSession } from "@/shared/lib/auth";
import { getOperationById } from "../lib/operations-service";

export async function getOperationByIdAction(operationId: string) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Необходима авторизация",
    };
  }

  try {
    const operation = await getOperationById(operationId, session.user.id);

    if (!operation) {
      return {
        error: "Операция не найдена",
      };
    }

    return {
      success: true,
      operation,
    };
  } catch (error) {
    console.error("Get operation by id error:", error);
    return {
      error: "Не удалось загрузить операцию",
    };
  }
}

