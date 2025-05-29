import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { customerApplications, tradeReferences } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { OPENAI_API_KEY } from '@/lib/config';

interface CreditAnalysisRequest {
  applicationId: number;
}

interface CreditRecommendation {
  decision: 'APPROVE' | 'CONDITIONAL' | 'DECLINE' | 'REVIEW';
  creditLimit: number;
  paymentTerms: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
  conditions?: string[];
  additionalNotes?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { applicationId }: CreditAnalysisRequest = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Fetch the application data
    const [application] = await db
      .select()
      .from(customerApplications)
      .where(eq(customerApplications.id, applicationId))
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Fetch trade references for this application
    const tradeReferencesData = await db
      .select()
      .from(tradeReferences)
      .where(eq(tradeReferences.applicationId, applicationId));

    // Prepare data for AI analysis
    const applicationData = {
      legalEntityName: application.legalEntityName,
      dba: application.dba,
      taxEIN: application.taxEIN,
      dunsNumber: application.dunsNumber,
      phoneNo: application.phoneNo,
      billToAddress: application.billToAddress,
      billToCityStateZip: application.billToCityStateZip,
      shipToAddress: application.shipToAddress,
      shipToCityStateZip: application.shipToCityStateZip,
      buyerNameEmail: application.buyerNameEmail,
      accountsPayableNameEmail: application.accountsPayableNameEmail,
      wantInvoicesEmailed: application.wantInvoicesEmailed,
      invoiceEmail: application.invoiceEmail,
      // Trade references from the separate table
      tradeReferences: tradeReferencesData.map(ref => ({
        name: ref.name,
        address: ref.address,
        cityStateZip: ref.cityStateZip,
        email: ref.email,
        fax: ref.faxNo,
        attention: ref.attn
      })).filter(ref => ref.name) // Only include references with names
    };

    // Call OpenAI GPT-4 mini for credit analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o4-mini',
        messages: [
          {
            role: 'system',
            content: `You are a senior credit analyst for Alliance Chemical, a B2B chemical distribution company. 

Your role is to analyze customer credit applications and provide recommendations based on:
- Business legitimacy and structure
- Contact information completeness
- Trade reference quality and quantity
- Geographic and industry risk factors
- Overall application completeness

Provide structured recommendations with:
- Decision: APPROVE, CONDITIONAL, DECLINE, or REVIEW
- Suggested credit limit (if approved/conditional)
- Payment terms (Net 15, Net 30, COD, etc.)
- Risk level assessment
- Clear reasoning for your decision
- Any conditions for approval
- Additional notes for the credit team

Consider Alliance Chemical's typical B2B customers include manufacturers, laboratories, water treatment facilities, and industrial operations.`
          },
          {
            role: 'user',
            content: `Please analyze this credit application and provide your recommendation:

${JSON.stringify(applicationData, null, 2)}

Provide your analysis in the following JSON format:
{
  "decision": "APPROVE|CONDITIONAL|DECLINE|REVIEW",
  "creditLimit": <number>,
  "paymentTerms": "<terms>",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "reasoning": "<detailed explanation>",
  "conditions": ["<condition1>", "<condition2>"],
  "additionalNotes": "<any additional insights>"
}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.1, // Low temperature for consistent analysis
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to analyze credit application' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const analysis: CreditRecommendation = JSON.parse(openaiData.choices[0].message.content);

    // Store the analysis result (you might want to add a credit_analyses table)
    const result = {
      applicationId,
      analysis,
      analyzedAt: new Date().toISOString(),
      model: 'o4-mini'
    };

    return NextResponse.json({
      success: true,
      analysis: result
    });

  } catch (error) {
    console.error('Error in credit analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error during credit analysis' },
      { status: 500 }
    );
  }
} 