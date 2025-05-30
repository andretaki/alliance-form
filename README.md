This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# AWS S3 Configuration for File Uploads
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Email Configuration (Mailgun)
MAIL_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com
EMAIL_FORM=form-submissions@your-domain.com

# OpenAI API for AI Analysis
OPENAI_API_KEY=your-openai-api-key

# Environment
NODE_ENV=development
```

## 🤖 AI Credit Analysis

The system includes **automated AI credit analysis** for every credit application:

### What It Analyzes:
- **Company Information**: Legal entity, DBA, tax EIN, DUNS number
- **Contact Details**: Professional email formats, phone numbers
- **Address Verification**: Billing and shipping addresses (Note: AI checks formatting/completeness, but cannot perform live verification against a database)
- **Trade References**: Quality and completeness of references
- **Risk Assessment**: Missing data, red flags, inconsistencies

### AI Analysis Process:
1. 📝 Customer submits application
2. 🤖 **o3 model analyzes all application data with advanced reasoning**
3. 📧 **Comprehensive credit report, including AI insights from the o3 model, emailed to Alliance Chemical**

The AI provides thorough B2B credit evaluation with decision recommendations, credit limits, payment terms, and risk levels using OpenAI's most advanced reasoning model.
