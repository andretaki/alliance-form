import { db } from '@/lib/db';
import { customerApplications, tradeReferences } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { OPENAI_API_KEY } from '@/lib/config';
import { sendEmail } from '@/lib/email';
import { 
  verifyDomain, 
  verifyBusiness, 
  validatePhoneNumber, 
  validateAddress, 
  calculateEnhancedCreditScore 
} from '@/lib/verification';

interface CreditDecision {
  decision: 'APPROVE' | 'CONDITIONAL' | 'DECLINE' | 'REVIEW';
  creditScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  creditLimit: number;
  paymentTerms: string;
  reasoning: string;
  conditions: string[];
  additionalNotes: string;
  verificationSummary: string;
  scoreBreakdown: Record<string, number>;
}

export async function processApplicationWithAI(applicationId: number): Promise<CreditDecision> {
  console.log(`🤖 AI PROCESSOR: Starting analysis for application #${applicationId}`);

  // Vercel environment validation
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured - using fallback analysis');
    // Continue with fallback instead of throwing
  }

  if (!db) {
    throw new Error('Database connection not available');
  }

  // Fetch application data
  const [application] = await db
    .select()
    .from(customerApplications)
    .where(eq(customerApplications.id, applicationId))
    .limit(1);

  if (!application) {
    throw new Error('Application not found');
  }

  // Fetch trade references
  const tradeReferencesData = await db
    .select()
    .from(tradeReferences)
    .where(eq(tradeReferences.applicationId, applicationId));

  console.log('🔍 AI PROCESSOR: Starting enhanced verification...');
  
  // Perform enhanced verification
  const domainVerification = await verifyDomain(application.buyerNameEmail || '');
  const businessVerification = await verifyBusiness(
    application.legalEntityName || '', 
    application.taxEIN || '',
    application.billToCityStateZip?.split(',')[1]?.trim().split(' ')[0]
  );
  const phoneValidation = validatePhoneNumber(application.phoneNo || '');
  const addressValidation = validateAddress(application.billToAddress || '');

  const verificationData = {
    domain: domainVerification,
    business: businessVerification,
    phone: phoneValidation,
    address: addressValidation
  };

  // Calculate enhanced credit score
  const creditScore = calculateEnhancedCreditScore(application, verificationData);

  console.log('🔍 AI PROCESSOR: Credit score calculated:', creditScore.score);

  // DETERMINISTIC DECISION LOGIC (NOT AI-BASED)
  let finalDecision: 'APPROVE' | 'CONDITIONAL' | 'DECLINE' | 'REVIEW';
  let finalLimit: number;
  let finalTerms: string;
  let finalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  let finalConditions: string[] = [];

  if (creditScore.score >= 700) {
    finalDecision = 'APPROVE';
    finalLimit = 50000;
    finalTerms = 'Net 30';
    finalRiskLevel = 'LOW';
  } else if (creditScore.score >= 600) {
    finalDecision = 'CONDITIONAL';
    finalLimit = 25000;
    finalTerms = 'Net 15';
    finalRiskLevel = 'MEDIUM';
    finalConditions = ['Provide additional trade references', 'Submit recent financial statements'];
  } else if (creditScore.score >= 400) {
    finalDecision = 'REVIEW';
    finalLimit = 10000;
    finalTerms = 'COD or Prepayment';
    finalRiskLevel = 'HIGH';
    finalConditions = ['Manual underwriting required', 'Additional documentation needed'];
  } else {
    finalDecision = 'DECLINE';
    finalLimit = 0;
    finalTerms = 'Cash in Advance Only';
    finalRiskLevel = 'HIGH';
    finalConditions = ['Credit profile does not meet minimum requirements'];
  }

  console.log('🎯 AI PROCESSOR: System decision:', finalDecision);

  // Prepare data for AI narrative generation
  const applicationData = {
    legalEntityName: application.legalEntityName,
    dba: application.dba,
    taxEIN: application.taxEIN,
    dunsNumber: application.dunsNumber,
    phoneNo: application.phoneNo,
    billToAddress: application.billToAddress,
    buyerNameEmail: application.buyerNameEmail,
    tradeReferences: tradeReferencesData.map(ref => ref.name).filter(Boolean),
  };

  // AI generates narrative ONLY - decisions are made by deterministic logic
  const prompt = `
You are a professional credit analyst writing an executive summary. The credit decision has ALREADY been made by our automated system based on verification data and credit scoring algorithms.

*** FINAL SYSTEM DECISION (DO NOT CHANGE) ***
- Decision: ${finalDecision}
- Credit Score: ${creditScore.score}/850
- Credit Limit: $${finalLimit.toLocaleString()}
- Payment Terms: ${finalTerms}
- Risk Level: ${finalRiskLevel}

*** VERIFICATION RESULTS ***
- Business Registration Valid: ${businessVerification.isValid} (Status: ${businessVerification.status})
- Domain Analysis: ${domainVerification.isValid ? 'Valid' : 'Invalid'} (Issues: ${domainVerification.suspiciousIndicators.join(', ') || 'None'})
- Phone Validation: ${phoneValidation.isValid ? 'Valid' : 'Invalid'} (Type: ${phoneValidation.type})
- Address Type: ${addressValidation.type} (Risk Factors: ${addressValidation.riskFactors.join(', ') || 'None'})

*** CREDIT SCORE BREAKDOWN ***
${Object.entries(creditScore.breakdown).map(([key, value]) => `- ${key}: ${value > 0 ? '+' : ''}${value} points`).join('\n')}

*** SCORING LOGIC REASONING ***
${creditScore.reasoning.join('\n')}

*** APPLICATION DATA ***
Company: ${applicationData.legalEntityName}
EIN: ${applicationData.taxEIN}
DUNS: ${applicationData.dunsNumber || 'Not provided'}
Contact: ${applicationData.buyerNameEmail}
Trade References: ${applicationData.tradeReferences.length}/3 provided

Write a professional, detailed credit analysis report explaining WHY this decision was made based on the verification results and scoring logic above. Be thorough and specific about the risk factors and strengths identified.

If this is a DECLINE, focus heavily on the red flags and verification failures.
If this is APPROVE, emphasize the positive verification results and strong credit indicators.
If CONDITIONAL or REVIEW, explain what additional steps are needed.

Respond with ONLY this JSON format (no markdown formatting):

{
  "executiveSummary": "3-4 sentence professional explanation of the credit decision based on verification data and scoring results",
  "keyStrengths": ["List 2-3 positive factors that support creditworthiness"],
  "criticalConcerns": ["List 2-3 red flags or risk factors identified"],
  "verificationSummary": "Summary of all verification checks performed and their results",
  "riskAssessment": "Detailed explanation of the risk level and why it was assigned",
  "recommendedActions": ["List 2-3 next steps or conditions for approval/monitoring"]
}`;

  console.log('🤖 AI PROCESSOR: Calling OpenAI for narrative generation...');

  // Only call OpenAI if API key is available
  if (!OPENAI_API_KEY) {
    console.log('🤖 AI PROCESSOR: Skipping OpenAI call - using system analysis only');
    
    // Fallback to system-only decision without AI narrative
    const result: CreditDecision = {
      decision: finalDecision,
      creditScore: creditScore.score,
      riskLevel: finalRiskLevel,
      creditLimit: finalLimit,
      paymentTerms: finalTerms,
      reasoning: `Automated credit analysis completed. Decision: ${finalDecision} based on credit score of ${creditScore.score}/850. Business verification: ${businessVerification.isValid ? 'Valid' : 'Failed'}. Domain analysis: ${domainVerification.isValid ? 'Clean' : 'Issues detected'}.`,
      conditions: finalConditions,
      additionalNotes: `Verification Summary: Business registration ${businessVerification.isValid ? 'valid' : 'invalid'}, Domain ${domainVerification.isValid ? 'clean' : 'flagged'}.\n\nScore Breakdown: ${Object.entries(creditScore.breakdown).map(([k,v]) => `${k}: ${v}`).join(', ')}`,
      verificationSummary: `Business: ${businessVerification.status}, Domain: ${domainVerification.isValid ? 'Valid' : 'Issues'}, Phone: ${phoneValidation.type}`,
      scoreBreakdown: creditScore.breakdown
    };

    console.log('✅ AI PROCESSOR: System analysis complete for application #' + applicationId);
    return result;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional credit analyst. Provide detailed, accurate analysis based strictly on the provided data. Return ONLY valid JSON with no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const openaiResult = await response.json();
    const aiContent = openaiResult.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content received from OpenAI');
    }

    console.log('🤖 AI PROCESSOR: OpenAI response received');

    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON response:', parseError);
      // Fallback to structured response
      aiAnalysis = {
        executiveSummary: `Credit analysis completed for ${application.legalEntityName}. Decision: ${finalDecision} with credit limit of $${finalLimit.toLocaleString()}. Risk level assessed as ${finalRiskLevel} based on verification results.`,
        keyStrengths: creditScore.score >= 600 ? ['Application completed', 'Business appears legitimate'] : ['Basic information provided'],
        criticalConcerns: creditScore.score < 600 ? ['Low credit score', 'High risk indicators'] : ['Standard risk factors'],
        verificationSummary: `Business verification: ${businessVerification.isValid ? 'Passed' : 'Failed'}. Domain analysis: ${domainVerification.isValid ? 'Clean' : 'Issues detected'}.`,
        riskAssessment: `Risk level ${finalRiskLevel} based on ${creditScore.score}/850 credit score.`,
        recommendedActions: finalConditions.length > 0 ? finalConditions : ['Monitor account performance']
      };
    }

    const result: CreditDecision = {
      decision: finalDecision,
      creditScore: creditScore.score,
      riskLevel: finalRiskLevel,
      creditLimit: finalLimit,
      paymentTerms: finalTerms,
      reasoning: aiAnalysis.executiveSummary || 'AI analysis completed',
      conditions: finalConditions,
      additionalNotes: [
        `Risk Assessment: ${aiAnalysis.riskAssessment || 'Standard risk evaluation'}`,
        `Key Strengths: ${(aiAnalysis.keyStrengths || []).join(', ')}`,
        `Critical Concerns: ${(aiAnalysis.criticalConcerns || []).join(', ')}`,
        `Recommended Actions: ${(aiAnalysis.recommendedActions || []).join(', ')}`
      ].join('\n\n'),
      verificationSummary: aiAnalysis.verificationSummary || 'Verification checks completed',
      scoreBreakdown: creditScore.breakdown
    };

    console.log('✅ AI PROCESSOR: Analysis complete for application #' + applicationId);
    return result;

  } catch (error) {
    console.error('❌ AI PROCESSOR: OpenAI API error:', error);
    
    // Fallback to system-only decision without AI narrative
    const result: CreditDecision = {
      decision: finalDecision,
      creditScore: creditScore.score,
      riskLevel: finalRiskLevel,
      creditLimit: finalLimit,
      paymentTerms: finalTerms,
      reasoning: `Automated credit analysis completed. Decision: ${finalDecision} based on credit score of ${creditScore.score}/850.`,
      conditions: finalConditions,
      additionalNotes: `Verification Summary: Business registration ${businessVerification.isValid ? 'valid' : 'invalid'}, Domain ${domainVerification.isValid ? 'clean' : 'flagged'}.\n\nScore Breakdown: ${Object.entries(creditScore.breakdown).map(([k,v]) => `${k}: ${v}`).join(', ')}`,
      verificationSummary: `Business: ${businessVerification.status}, Domain: ${domainVerification.isValid ? 'Valid' : 'Issues'}, Phone: ${phoneValidation.type}`,
      scoreBreakdown: creditScore.breakdown
    };

    return result;
  }
}

export async function sendAIAnalysisReport(applicationData: any, aiDecision: CreditDecision): Promise<void> {
  if (!process.env.EMAIL_FORM) {
    console.warn('EMAIL_FORM environment variable not set. Cannot send AI analysis report.');
    return;
  }

  const subject = `🤖 AI CREDIT ANALYSIS: ${aiDecision.decision} - ${applicationData.legalEntityName} (#${applicationData.id})`;
  
  const getDecisionEmoji = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return '✅';
      case 'CONDITIONAL': return '⚠️';
      case 'DECLINE': return '❌';
      case 'REVIEW': return '🔍';
      default: return '📋';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return '#10b981'; // green
      case 'CONDITIONAL': return '#f59e0b'; // yellow
      case 'DECLINE': return '#ef4444'; // red
      case 'REVIEW': return '#3b82f6'; // blue
      default: return '#6b7280'; // gray
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const textBody = `
🤖 AI CREDIT ANALYSIS COMPLETE
=====================================

DECISION: ${aiDecision.decision} ${getDecisionEmoji(aiDecision.decision)}
Company: ${applicationData.legalEntityName}
Application ID: #${applicationData.id}
Analysis Date: ${new Date().toISOString()}

📊 CREDIT SUMMARY
- Credit Score: ${aiDecision.creditScore}/850
- Risk Level: ${aiDecision.riskLevel}
- Credit Limit: $${aiDecision.creditLimit.toLocaleString()}
- Payment Terms: ${aiDecision.paymentTerms}

🔍 VERIFICATION SUMMARY
${aiDecision.verificationSummary}

📝 EXECUTIVE SUMMARY
${aiDecision.reasoning}

⚠️ CONDITIONS (${aiDecision.conditions.length})
${aiDecision.conditions.map((condition, i) => `${i+1}. ${condition}`).join('\n')}

📋 ADDITIONAL NOTES
${aiDecision.additionalNotes}

💯 SCORE BREAKDOWN
${Object.entries(aiDecision.scoreBreakdown).map(([key, value]) => `- ${key}: ${value > 0 ? '+' : ''}${value} points`).join('\n')}

=====================================

👨‍💼 ANDRE'S DECISION REQUIRED

APPROVE FOR $10,000: ${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=1000000
DENY APPLICATION: ${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=DENY

Other amounts:
- $5,000: ${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=500000
- $15,000: ${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=1500000
- $25,000: ${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=2500000
- $50,000: ${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=5000000

What happens next:
- APPROVE: Customer gets welcome email with Net 30 terms
- DENY: Customer gets polite denial with CIA options
- All customer contacts will be notified automatically

=====================================
This analysis was generated by our AI-powered credit processing system.
`;

  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.vercel.app' // Replace with your actual domain
      : 'http://localhost:3000';

  const htmlBody = `
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .decision-badge { display: inline-block; padding: 10px 20px; border-radius: 25px; font-weight: bold; font-size: 18px; margin: 10px 0; }
    .content { background: #f8fafc; padding: 30px; }
    .section { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .metric { text-align: center; padding: 15px; background: #f1f5f9; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .conditions { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .breakdown { background: #f0f9ff; padding: 15px; border-radius: 8px; }
    .breakdown-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .approval-section { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 3px solid #3b82f6; border-radius: 15px; padding: 30px; margin: 30px 0; text-align: center; }
    .approval-buttons { display: flex; gap: 20px; justify-content: center; margin: 25px 0; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; transition: all 0.3s ease; }
    .btn-approve { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; }
    .btn-approve:hover { background: linear-gradient(135deg, #059669 0%, #047857 100%); transform: translateY(-2px); box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3); }
    .btn-deny { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; }
    .btn-deny:hover { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); transform: translateY(-2px); box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3); }
    .amount-options { display: flex; gap: 10px; justify-content: center; margin: 20px 0; flex-wrap: wrap; }
    .amount-btn { padding: 8px 16px; background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 6px; text-decoration: none; color: #374151; font-weight: 500; }
    .amount-btn:hover { background: #e0f2fe; border-color: #3b82f6; }
    .footer { text-align: center; margin-top: 30px; padding: 20px; background: #1f2937; color: white; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 AI Credit Analysis Report</h1>
    <div class="decision-badge" style="background-color: ${getDecisionColor(aiDecision.decision)};">
      ${getDecisionEmoji(aiDecision.decision)} ${aiDecision.decision}
    </div>
    <p><strong>${applicationData.legalEntityName}</strong> | Application #${applicationData.id}</p>
    <p>Analysis completed: ${new Date().toLocaleString()}</p>
  </div>

  <div class="content">
    <div class="grid">
      <div class="metric">
        <div class="metric-value">${aiDecision.creditScore}/850</div>
        <div>Credit Score</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: ${getRiskColor(aiDecision.riskLevel)};">${aiDecision.riskLevel}</div>
        <div>Risk Level</div>
      </div>
      <div class="metric">
        <div class="metric-value">$${aiDecision.creditLimit.toLocaleString()}</div>
        <div>Credit Limit</div>
      </div>
      <div class="metric">
        <div class="metric-value">${aiDecision.paymentTerms}</div>
        <div>Payment Terms</div>
      </div>
    </div>

    <div class="section">
      <h3>🔍 Verification Summary</h3>
      <p>${aiDecision.verificationSummary}</p>
    </div>

    <div class="section">
      <h3>📝 Executive Summary</h3>
      <p>${aiDecision.reasoning}</p>
    </div>

    ${aiDecision.conditions.length > 0 ? `
    <div class="conditions">
      <h3>⚠️ Conditions for Approval</h3>
      <ul>
        ${aiDecision.conditions.map(condition => `<li>${condition}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <h3>📋 Additional Analysis Notes</h3>
      <div style="white-space: pre-line;">${aiDecision.additionalNotes}</div>
    </div>

    <div class="section">
      <h3>💯 Credit Score Breakdown</h3>
      <div class="breakdown">
        ${Object.entries(aiDecision.scoreBreakdown).map(([key, value]) => `
          <div class="breakdown-item">
            <span>${key}</span>
            <span class="${value > 0 ? 'positive' : 'negative'}">${value > 0 ? '+' : ''}${value} points</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h3>📄 Application Details</h3>
      <ul>
        <li><strong>Legal Entity:</strong> ${applicationData.legalEntityName}</li>
        <li><strong>Tax EIN:</strong> ${applicationData.taxEIN}</li>
        <li><strong>Contact:</strong> ${applicationData.buyerNameEmail}</li>
        <li><strong>Phone:</strong> ${applicationData.phoneNo}</li>
        <li><strong>DUNS:</strong> ${applicationData.dunsNumber || 'Not provided'}</li>
      </ul>
    </div>

    <!-- APPROVAL SECTION -->
    <div class="approval-section">
      <h2 style="margin-top: 0; color: #1e40af;">👨‍💼 ANDRE'S DECISION REQUIRED</h2>
      <p style="font-size: 18px; margin: 15px 0;">Review the AI analysis above and make your credit decision:</p>
      
      <div class="approval-buttons">
        <a href="${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=1000000" 
           class="btn btn-approve">
          ✅ APPROVE for $10,000
        </a>
        <a href="${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=DENY" 
           class="btn btn-deny">
          ❌ DENY APPLICATION
        </a>
      </div>

      <div style="margin: 25px 0;">
        <p style="margin: 10px 0; color: #374151;"><strong>Or approve for a different amount:</strong></p>
        <div class="amount-options">
          <a href="${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=500000" class="amount-btn">$5,000</a>
          <a href="${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=1500000" class="amount-btn">$15,000</a>
          <a href="${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=2500000" class="amount-btn">$25,000</a>
          <a href="${baseUrl}/api/credit-approval?id=${applicationData.id}&decision=APPROVE&amount=5000000" class="amount-btn">$50,000</a>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.8); border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #666;">
        <p style="margin: 0;"><strong>📧 What happens next:</strong></p>
        <ul style="margin: 10px 0; text-align: left; display: inline-block;">
          <li><strong>APPROVE:</strong> Customer gets welcome email with Net 30 terms</li>
          <li><strong>DENY:</strong> Customer gets polite denial with CIA options</li>
          <li>All customer contacts (buyer, AP, invoice emails) will be notified</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>🤖 This analysis was generated by Alliance Chemical's AI-powered credit processing system</p>
    <p>Automated decision based on verification data, credit scoring algorithms, and AI narrative generation</p>
  </div>
</body>
</html>
`;

  await sendEmail({
    to: process.env.EMAIL_FORM,
    subject: subject,
    text: textBody,
    html: htmlBody,
  });

  console.log('📧 AI Analysis report sent via email');
}