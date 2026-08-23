import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js', // Keep your .js or update to .ts if using TypeScript
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});