import dotenv from "dotenv";

dotenv.config();

const required: string[] = [];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing required environment variables:", missing.join(", "));
  console.error("The application cannot start without these credentials.");
  process.exit(1);
}

export const config = {
};
