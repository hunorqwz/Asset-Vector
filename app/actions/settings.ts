"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(name: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };

  try {
    await db.update(users)
      .set({ name })
      .where(eq(users.id, session.user.id));

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    console.error("[Settings] Profile update failed:", err);
    return { success: false, error: err.message || "DATABASE_ERROR" };
  }
}

export async function deleteUserAccount(): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "UNAUTHORIZED" };

  try {
    await db.delete(users).where(eq(users.id, session.user.id));
    return { success: true };
  } catch (err: any) {
    console.error("[Settings] Account deletion failed:", err);
    return { success: false, error: err.message || "DATABASE_ERROR" };
  }
}
