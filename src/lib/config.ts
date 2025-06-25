// AWS Configuration
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const AWS_REGION = process.env.AWS_REGION;
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  if (!AWS_ACCESS_KEY_ID) console.error("AWS_ACCESS_KEY_ID is not defined!");
  if (!AWS_SECRET_ACCESS_KEY) console.error("AWS_SECRET_ACCESS_KEY is not defined!");
  if (!AWS_S3_BUCKET_NAME) console.error("AWS_S3_BUCKET_NAME is not defined!");
  if (!AWS_REGION) console.error("AWS_REGION is not defined!");
}

// Email Configuration - Microsoft Graph (Primary and Only)
export const MICROSOFT_GRAPH_CLIENT_ID = process.env.MICROSOFT_GRAPH_CLIENT_ID;
export const MICROSOFT_GRAPH_CLIENT_SECRET = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;
export const MICROSOFT_GRAPH_TENANT_ID = process.env.MICROSOFT_GRAPH_TENANT_ID;
export const MICROSOFT_GRAPH_USER_EMAIL = process.env.MICROSOFT_GRAPH_USER_EMAIL || process.env.EMAIL_FORM;
export const EMAIL_FORM = process.env.EMAIL_FORM; // Where to send AI analysis/approval emails (andre@alliancechemical.com)

// Validate Microsoft Graph configuration in production
if (process.env.NODE_ENV === 'production') {
  if (!MICROSOFT_GRAPH_CLIENT_ID) console.error("MICROSOFT_GRAPH_CLIENT_ID is not defined!");
  if (!MICROSOFT_GRAPH_CLIENT_SECRET) console.error("MICROSOFT_GRAPH_CLIENT_SECRET is not defined!");
  if (!MICROSOFT_GRAPH_TENANT_ID) console.error("MICROSOFT_GRAPH_TENANT_ID is not defined!");
  if (!MICROSOFT_GRAPH_USER_EMAIL) console.error("MICROSOFT_GRAPH_USER_EMAIL is not defined!");
  if (!EMAIL_FORM) console.error("EMAIL_FORM is not defined!");
}

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL;

// OpenAI Configuration
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 