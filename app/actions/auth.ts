"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    return { success: false, error: "Missing required identity fields." };
  }

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      return { success: false, error: "Identity email already registered in cluster." };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      tier: "free", // Default tier
    });

    revalidatePath("/login");
    return { success: true };
  } catch (err) {
    console.error("Failed to register user:", err);
    return { success: false, error: "Protocol initialization error. Database is unreachable." };
  }
}
