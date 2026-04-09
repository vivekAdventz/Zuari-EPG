import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file. The .env file is in the root of the backend directory.
// Since this file (env.js) is in src/config, the root is two levels up.
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    PORT: process.env.PORT || 5000,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ORIGIN: process.env.ORIGIN || 'http://localhost:5173',
    ORIGIN2: process.env.ORIGIN2 || 'http://localhost:5174',
    ORIGIN3: process.env.ORIGIN3 || 'http://localhost:5175',
    ORIGIN4: process.env.ORIGIN4 || 'http://localhost:5176',
    API_URL: process.env.API_URL,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    MS_TENANT_ID: (process.env.MS_TENANT_ID || "").trim().replace(/^"|"$/g, ''),
    MS_CLIENT_ID: (process.env.MS_CLIENT_ID || "").trim().replace(/^"|"$/g, '')
};

// Validate that important variables are set
if (!config.MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file");
    process.exit(1);
}
// Add other validations if needed

export default config;