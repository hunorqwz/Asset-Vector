import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.log("No API key found!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function check() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log("Available models:");
    data.models?.forEach((m: any) => console.log(m.name));
  } catch (e) {
    console.log("Error checking models", e);
  }
}

check();
