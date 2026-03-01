import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log("🌱 Seeding access credentials...");
  
  const email = "admin@vector.io";
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      email,
      name: "Alpha Admin",
      password: hashedPassword,
      tier: "pro"
    }).onConflictDoUpdate({
      target: users.email,
      set: { password: hashedPassword }
    });
    
    console.log("✅ Identity established.");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
  } catch (err) {
    console.error("❌ Failed to seed user:", err);
  }
}

seed().catch(console.error);
