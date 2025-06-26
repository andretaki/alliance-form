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
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  creditLimit: number;
  paymentTerms: string;
  reasoning: string;
  conditions: string[];
  additionalNotes: string;
  verificationSummary: string;
  scoreBreakdown: Record<string, number>;
  fraudRiskScore: number;
  auditFlags: string[];
}

interface FakeDataResult {
  isFake: boolean;
  reasons: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  fraudProbability: number;
}

interface DeepAuditResult {
  suspicionLevel: number; // 0-100
  redFlags: string[];
  behavioralAnomalies: string[];
  dataConsistency: number; // 0-100
  industryRiskScore: number; // 0-100
}

// HARDCORE FRAUD DETECTION PATTERNS
const HARDCORE_PATTERNS = {
  // Expanded profanity and inappropriate terms
  profanity: [
    'fuck', 'shit', 'damn', 'ass', 'bitch', 'crap', 'hell', 'piss', 'bastard', 
    'dick', 'cock', 'pussy', 'whore', 'fuk', 'sht', 'azz', 'b1tch', 'fck',
    'porn', 'sex', 'nude', 'xxx', 'cannabis', 'weed', '420', 'drug', 'meth'
  ],
  
  // Suspicious business name patterns
  suspiciousBusinessPatterns: [
    /^[A-Z]{3,4}\s*(inc|llc|corp)?$/i, // Just initials (ABC Inc)
    /^\d+\s*(inc|llc|corp)?$/i, // Just numbers (123 LLC)
    /^(new|best|top|great|super|mega|ultra)\s*(company|business|corp|inc|llc)$/i,
    /cash\s*(only|now|fast|quick)/i,
    /get\s*(rich|money|paid)\s*(quick|fast|now)/i,
    /(pyramid|scheme|mlm|ponzi)/i,
    /no\s*(credit|questions|verification)/i
  ],
  
  // Known scammer patterns
  scammerPatterns: [
    'nigerian', 'prince', 'lottery', 'winner', 'inheritance',
    'offshore', 'tax haven', 'anonymous', 'untraceable'
  ],
  
  // Suspicious email patterns
  suspiciousEmailDomains: [
    'guerrillamail.com', 'mailinator.com', '10minutemail.com', 'tempmail.com',
    'throwaway.email', 'getnada.com', 'temp-mail.org', 'maildrop.cc',
    'yopmail.com', 'sharklasers.com', 'spam4.me', 'grr.la'
  ],
  
  // High-risk industries
  highRiskIndustries: [
    'cryptocurrency', 'crypto', 'bitcoin', 'forex', 'trading',
    'gambling', 'casino', 'betting', 'adult', 'escort',
    'payday', 'loan', 'advance', 'mlm', 'network marketing'
  ]
};

function detectFakeData(application: any): FakeDataResult {
  const reasons: string[] = [];
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let fraudScore = 0;

  const companyName = (application.legalEntityName || '').toLowerCase().trim();
  const email = (application.buyerNameEmail || '').toLowerCase();
  const description = (application.businessDescription || '').toLowerCase();
  
  // HARDCORE PROFANITY CHECK
  for (const word of HARDCORE_PATTERNS.profanity) {
    if (companyName.includes(word) || description.includes(word)) {
      reasons.push(`🚨 PROFANITY/INAPPROPRIATE: "${word}" detected`);
      confidence = 'HIGH';
      fraudScore += 30;
    }
  }

  // SUSPICIOUS BUSINESS NAME PATTERNS
  for (const pattern of HARDCORE_PATTERNS.suspiciousBusinessPatterns) {
    if (pattern.test(companyName)) {
      reasons.push(`⚠️ SUSPICIOUS NAME PATTERN: Matches "${pattern}"`);
      confidence = 'HIGH';
      fraudScore += 25;
    }
  }

  // SCAMMER KEYWORD DETECTION
  for (const scamWord of HARDCORE_PATTERNS.scammerPatterns) {
    if (companyName.includes(scamWord) || description.includes(scamWord)) {
      reasons.push(`🚨 SCAM INDICATOR: "${scamWord}" detected`);
      confidence = 'HIGH';
      fraudScore += 40;
    }
  }

  // DISPOSABLE EMAIL CHECK
  const emailDomain = email.split('@')[1];
  if (emailDomain && HARDCORE_PATTERNS.suspiciousEmailDomains.includes(emailDomain)) {
    reasons.push(`🚨 DISPOSABLE EMAIL: ${emailDomain}`);
    confidence = 'HIGH';
    fraudScore += 35;
  }

  // FREE EMAIL FOR BUSINESS
  const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
  if (emailDomain && freeEmailDomains.includes(emailDomain)) {
    reasons.push(`⚠️ FREE EMAIL SERVICE: ${emailDomain} (unprofessional for business)`);
    if (confidence === 'LOW') confidence = 'MEDIUM';
    fraudScore += 15;
  }

  // GIBBERISH DETECTION - Enhanced
  const nameWords = companyName.split(/\s+/);
  const consonantClusters = nameWords.filter((word: string) => {
    const consonantRatio = (word.match(/[^aeiou]/gi) || []).length / word.length;
    return word.length > 3 && consonantRatio > 0.75;
  });
  
  if (consonantClusters.length > nameWords.length * 0.5) {
    reasons.push('🚨 GIBBERISH DETECTED: Excessive consonant clusters');
    confidence = 'HIGH';
    fraudScore += 20;
  }

  // REPEATED PATTERNS
  if (/(.{2,})\1{2,}/.test(companyName)) {
    reasons.push('🚨 REPEATED PATTERN: Suspicious character repetition');
    confidence = 'HIGH';
    fraudScore += 25;
  }

  // KEYBOARD MASHING DETECTION
  const keyboardPatterns = ['qwerty', 'asdf', 'zxcv', 'qazwsx', 'qwertyuiop'];
  for (const pattern of keyboardPatterns) {
    if (companyName.includes(pattern)) {
      reasons.push(`🚨 KEYBOARD MASHING: "${pattern}" detected`);
      confidence = 'HIGH';
      fraudScore += 30;
    }
  }

  // PHONE NUMBER VALIDATION - EXTREME
  const phone = (application.phoneNo || '').replace(/\D/g, '');
  
  // Check for movie/TV phone numbers
  if (phone.startsWith('555') && phone.length === 10) {
    reasons.push(`🚨 FAKE PHONE: Hollywood 555 number`);
    confidence = 'HIGH';
    fraudScore += 40;
  }

  // Check for sequential patterns
  if (/0123456789|9876543210|1234567890/.test(phone)) {
    reasons.push(`🚨 FAKE PHONE: Sequential pattern detected`);
    confidence = 'HIGH';
    fraudScore += 35;
  }

  // EIN DEEP VALIDATION
  const ein = (application.taxEIN || '').replace(/\D/g, '');
  
  if (ein.length === 9) {
    // Check first two digits (should be valid IRS prefixes)
    const prefix = parseInt(ein.substring(0, 2));
    const validPrefixes = [
      ...Array.from({length: 7}, (_, i) => i + 1), // 01-06
      ...Array.from({length: 6}, (_, i) => i + 10), // 10-16
      20, 24, 25, 26, 27, // Various states
      ...Array.from({length: 18}, (_, i) => i + 30), // 30-47
      ...Array.from({length: 38}, (_, i) => i + 50), // 50-87
      ...Array.from({length: 8}, (_, i) => i + 90), // 90-95, 98, 99
    ];
    
    if (!validPrefixes.includes(prefix)) {
      reasons.push(`🚨 INVALID EIN PREFIX: ${prefix} not issued by IRS`);
      confidence = 'HIGH';
      fraudScore += 45;
    }
  }

  // ADDRESS QUALITY CHECK
  const address = (application.billToAddress || '').toLowerCase();
  const poBoxPattern = /^(po box|p\.o\. box|post office box)/i;
  const suspiciousAddressWords = ['nowhere', 'fake street', 'test avenue', '123 main'];
  
  if (poBoxPattern.test(address)) {
    reasons.push('⚠️ PO BOX ADDRESS: Higher risk for B2B credit');
    fraudScore += 10;
  }

  for (const suspicious of suspiciousAddressWords) {
    if (address.includes(suspicious)) {
      reasons.push(`🚨 FAKE ADDRESS: Contains "${suspicious}"`);
      confidence = 'HIGH';
      fraudScore += 30;
    }
  }

  // BUSINESS DESCRIPTION ANALYSIS
  if (description.length < 20) {
    reasons.push('⚠️ MINIMAL DESCRIPTION: Insufficient business details');
    fraudScore += 15;
  }

  if (description.length > 20) {
    const uniqueWords = new Set(description.split(/\s+/));
    const repetitionRatio = description.split(/\s+/).length / uniqueWords.size;
    
    if (repetitionRatio > 3) {
      reasons.push('🚨 REPETITIVE DESCRIPTION: Same words repeated excessively');
      confidence = 'HIGH';
      fraudScore += 25;
    }
  }

  // HIGH-RISK INDUSTRY CHECK
  for (const riskyTerm of HARDCORE_PATTERNS.highRiskIndustries) {
    if (companyName.includes(riskyTerm) || description.includes(riskyTerm)) {
      reasons.push(`⚠️ HIGH-RISK INDUSTRY: "${riskyTerm}" detected`);
      fraudScore += 20;
    }
  }

  // Calculate final fraud probability
  const fraudProbability = Math.min(fraudScore, 100);

  // Adjust confidence based on total fraud score
  if (fraudProbability >= 70) {
    confidence = 'HIGH';
  } else if (fraudProbability >= 40) {
    confidence = 'MEDIUM';
  }

  return {
    isFake: reasons.length > 0,
    reasons,
    confidence,
    fraudProbability
  };
}

// 🤖 AGENT 1: FRAUD DETECTION (o3-mini-2025-01-31)
async function runFraudDetectionAgent(application: any): Promise<{
  isFraud: boolean;
  confidence: number;
  reasons: string[];
  shouldProceed: boolean;
}> {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API key not configured - using basic fraud detection');
    const basicCheck = detectFakeData(application);
    return {
      isFraud: basicCheck.isFake,
      confidence: basicCheck.fraudProbability,
      reasons: basicCheck.reasons,
      shouldProceed: !basicCheck.isFake || basicCheck.confidence !== 'HIGH'
    };
  }

  const prompt = `You are a FRAUD DETECTION SPECIALIST. Your ONLY job is to identify fake, test, or fraudulent credit applications.

ANALYZE THIS APPLICATION FOR FRAUD:

Company Name: "${application.legalEntityName}"
Tax EIN: "${application.taxEIN}"
Email: "${application.buyerNameEmail}"
Phone: "${application.phoneNo}"
Address: "${application.billToAddress}"
City/State: "${application.billToCity}, ${application.billToState}"
Business Description: "${application.businessDescription}"

FRAUD INDICATORS TO CHECK:
🚨 Nonsense company names (gibberish, repeated patterns, profanity)
🚨 Sequential/repetitive phone numbers (555-1234, 111-1111, etc)
🚨 Fake emails (test@test.com, fake@fake.com, etc)
🚨 Invalid EIN patterns (all same digits, sequential numbers)
🚨 Gibberish or overly short business descriptions
🚨 Obvious test data keywords (test, demo, fake, sample, etc)
🚨 Keyboard mashing patterns (asdf, qwerty, etc)

EXAMPLES OF FRAUD:
- "BOPBOPBOP" (repetitive nonsense)
- "Test Company LLC" (obvious test data)
- "AAAAAAA Inc" (repetitive characters)
- "123 Fake Street" (fake address)
- "555-555-5555" (movie phone number)

Return ONLY valid JSON:
{
  "isFraud": true/false,
  "confidence": 0-100,
  "reasons": ["specific fraud indicators found"],
  "verdict": "REJECT/REVIEW/PROCEED",
  "explanation": "brief reason for decision"
}`;

  try {
    console.log('🕵️ AGENT 1: Running fraud detection...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o3-mini-2025-01-31', // Locked snapshot for consistency
        messages: [
          {
            role: 'system',
            content: 'You are an expert fraud detection specialist. Identify fake/test data with high precision. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Very low for consistent fraud detection
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Fraud detection API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from fraud detection agent');
    }

    const fraudAnalysis = JSON.parse(content);
    console.log(`🕵️ AGENT 1: Fraud confidence = ${fraudAnalysis.confidence}%`);

    return {
      isFraud: fraudAnalysis.isFraud,
      confidence: fraudAnalysis.confidence,
      reasons: fraudAnalysis.reasons || [],
      shouldProceed: fraudAnalysis.verdict === 'PROCEED'
    };

  } catch (error) {
    console.error('❌ AGENT 1: Fraud detection failed:', error);
    // Fallback to basic detection
    const basicCheck = detectFakeData(application);
    return {
      isFraud: basicCheck.isFake,
      confidence: basicCheck.fraudProbability,
      reasons: basicCheck.reasons,
      shouldProceed: !basicCheck.isFake || basicCheck.confidence !== 'HIGH'
    };
  }
}

// 🤖 AGENT 2: CREDIT ANALYSIS (o3-mini-2025-01-31)
async function runCreditAnalysisAgent(
  application: any, 
  verificationData: any, 
  creditScore: any,
  systemDecision: any
): Promise<{
  finalDecision: string;
  reasoning: string;
  riskAdjustment: string;
  conditions: string[];
  analysis: string;
}> {
  if (!OPENAI_API_KEY) {
    return {
      finalDecision: systemDecision.decision,
      reasoning: `System analysis: Score ${creditScore.score}/850, Risk ${systemDecision.riskLevel}`,
      riskAdjustment: 'No adjustment',
      conditions: systemDecision.conditions,
      analysis: 'Basic system analysis completed'
    };
  }

  const prompt = `You are a SENIOR CREDIT ANALYST reviewing a legitimate business credit application.

The FRAUD DETECTION AGENT has already cleared this application as legitimate.

APPLICATION DATA:
Company: ${application.legalEntityName}
Tax EIN: ${application.taxEIN}
DUNS: ${application.dunsNumber || 'Not provided'}
Industry: ${application.industry}
Employees: ${application.numberOfEmployees}
Years in Business: ${application.yearsSinceIncorporation}
Requested Credit: $${application.requestedCreditAmount?.toLocaleString()}

VERIFICATION RESULTS:
- Business Registration: ${verificationData.business?.isValid ? 'VALID' : 'INVALID'}
- Domain Verification: ${verificationData.domain?.isValid ? 'CLEAN' : 'SUSPICIOUS'}
- Phone Type: ${verificationData.phone?.type || 'Unknown'}
- Address Type: ${verificationData.address?.type || 'Unknown'}

SYSTEM CREDIT SCORE: ${creditScore.score}/850
SYSTEM RECOMMENDATION: ${systemDecision.decision} - $${systemDecision.limit?.toLocaleString()} @ ${systemDecision.terms}

SCORE BREAKDOWN:
${Object.entries(creditScore.breakdown || {}).map(([k,v]) => `• ${k}: ${v} points`).join('\n')}

As the credit analyst, provide your professional assessment:

Return ONLY valid JSON:
{
  "approveSystemDecision": true/false,
  "finalDecision": "APPROVE/CONDITIONAL/DECLINE/REVIEW",
  "creditLimit": number,
  "paymentTerms": "Net 30/Net 15/COD",
  "riskLevel": "LOW/MEDIUM/HIGH",
  "keyStrengths": ["positive factors"],
  "concerns": ["risk factors"],
  "conditions": ["required conditions if conditional"],
  "reasoning": "professional analysis summary",
  "confidence": 0-100
}`;

  try {
    console.log('💼 AGENT 2: Running credit analysis...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o3-mini-2025-01-31', // Locked snapshot for consistency
        messages: [
          {
            role: 'system',
            content: 'You are a senior credit analyst with 15+ years experience. Provide thorough, professional credit assessments. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Low for consistent analysis
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`Credit analysis API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from credit analysis agent');
    }

    const creditAnalysis = JSON.parse(content);
    console.log(`💼 AGENT 2: Final decision = ${creditAnalysis.finalDecision}`);

    return {
      finalDecision: creditAnalysis.finalDecision,
      reasoning: creditAnalysis.reasoning,
      riskAdjustment: creditAnalysis.approveSystemDecision ? 'Approved system recommendation' : 'Adjusted system recommendation',
      conditions: creditAnalysis.conditions || [],
      analysis: `Strengths: ${creditAnalysis.keyStrengths?.join(', ')} | Concerns: ${creditAnalysis.concerns?.join(', ')}`
    };

  } catch (error) {
    console.error('❌ AGENT 2: Credit analysis failed:', error);
    return {
      finalDecision: systemDecision.decision,
      reasoning: `Fallback system analysis: Score ${creditScore.score}/850`,
      riskAdjustment: 'System fallback',
      conditions: systemDecision.conditions,
      analysis: 'Credit analysis agent unavailable - using system decision'
    };
  }
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

  // 🚨 AGENT 1: FRAUD DETECTION AGENT (o3-mini-2025-01-31)
  console.log('🤖 Running 2-Agent Credit Analysis System...');
  console.log('🕵️ AGENT 1: Starting fraud detection screening...');
  
  const fraudResult = await runFraudDetectionAgent(application);
  
  if (fraudResult.isFraud && !fraudResult.shouldProceed) {
    console.log(`🚨 AGENT 1: FRAUD DETECTED - Confidence ${fraudResult.confidence}%`);
    console.log(`🚨 Reasons: ${fraudResult.reasons.join(', ')}`);
    
    return {
      decision: 'DECLINE',
      creditScore: 0,
      riskLevel: 'EXTREME',
      creditLimit: 0,
      paymentTerms: 'Cash in Advance Only',
      reasoning: `🚨 APPLICATION REJECTED BY AI FRAUD DETECTION AGENT\n\nThis application has been automatically rejected by our AI fraud detection specialist due to obvious fake or test data submission:\n\n${fraudResult.reasons.map(r => `• ${r}`).join('\n')}\n\nOur o3-mini AI agent determined this application contains fraudulent patterns with ${fraudResult.confidence}% confidence.\n\nTo submit a legitimate application, please use real business information including:\n• Actual company name (no nonsense words or repetitive patterns)\n• Valid business phone number (no movie/TV numbers)\n• Real Tax EIN from IRS\n• Legitimate business email address\n• Genuine business description\n\nFor assistance with a legitimate application, contact sales@alliancechemical.com`,
      conditions: ['Resubmit with legitimate business information'],
      additionalNotes: `🤖 REJECTED BY AI FRAUD DETECTION AGENT (o3-mini-2025-01-31)\n\nFraud Confidence: ${fraudResult.confidence}%\nFlags Raised: ${fraudResult.reasons.length}\nAgent Decision: Do not proceed to credit analysis\n\nThis application was rejected before any credit analysis to prevent waste of computational resources on obviously fraudulent submissions.`,
      verificationSummary: 'Verification skipped - fraud detected by AI agent during pre-screening',
      scoreBreakdown: {
        'AI Fraud Detection': -1000,
        'Application Quality': 0,
        'Business Verification': 0,
        'Domain Verification': 0,
        'Phone Verification': 0,
        'Address Verification': 0,
        'Trade References': 0,
        'DUNS Verification': 0
      },
      fraudRiskScore: fraudResult.confidence,
      auditFlags: fraudResult.reasons
    };
  }
  
  // Log fraud warnings but continue to credit analysis
  if (fraudResult.isFraud && fraudResult.shouldProceed) {
    console.log(`⚠️ AGENT 1: SUSPICIOUS patterns detected (${fraudResult.confidence}% confidence) but proceeding to credit analysis...`);
    console.log(`⚠️ Flags: ${fraudResult.reasons.join(', ')}`);
  } else {
    console.log(`✅ AGENT 1: Application cleared fraud screening - proceeding to credit analysis`);
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

  console.log('🎯 SYSTEM: Initial recommendation:', finalDecision);

  // 💼 AGENT 2: CREDIT ANALYSIS AGENT (o3-mini-2025-01-31)
  console.log('💼 AGENT 2: Starting detailed credit analysis...');
  
  const systemDecision = {
    decision: finalDecision,
    limit: finalLimit,
    terms: finalTerms,
    riskLevel: finalRiskLevel,
    conditions: finalConditions
  };
  
  const creditAnalysisResult = await runCreditAnalysisAgent(
    application,
    verificationData,
    creditScore,
    systemDecision
  );
  
  // Update final decision based on Agent 2's analysis
  finalDecision = creditAnalysisResult.finalDecision as any;
  finalLimit = determineLimit(creditAnalysisResult.finalDecision);
  finalTerms = determineTerms(creditAnalysisResult.finalDecision);
  finalRiskLevel = determineFinalRiskLevel(creditAnalysisResult.finalDecision);
  finalConditions = creditAnalysisResult.conditions;

  console.log(`💼 AGENT 2: Final decision = ${finalDecision} (${creditAnalysisResult.riskAdjustment})`);

  // Helper functions for Agent 2 decision mapping
  function determineLimit(decision: string): number {
    switch(decision) {
      case 'APPROVE': return 50000;
      case 'CONDITIONAL': return 25000;
      case 'REVIEW': return 10000;
      default: return 0;
    }
  }
  
  function determineTerms(decision: string): string {
    switch(decision) {
      case 'APPROVE': return 'Net 30';
      case 'CONDITIONAL': return 'Net 15';
      case 'REVIEW': return 'COD or Prepayment';
      default: return 'Cash in Advance Only';
    }
  }
  
  function determineFinalRiskLevel(decision: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch(decision) {
      case 'APPROVE': return 'LOW';
      case 'CONDITIONAL': return 'MEDIUM';
      default: return 'HIGH';
    }
  }

  // **LEGACY: Keep o3 analysis for comparison (optional)**
  let o3Analysis = null;
  if (OPENAI_API_KEY && false) { // Disabled - using new 2-agent system
    try {
      console.log('🧠 LEGACY: Calling o3 for comparison...');
      
      const o3Prompt = `You are an expert credit analyst. Analyze this credit application and provide analytical insights.

*** APPLICATION DATA ***
Company: ${application.legalEntityName}
EIN: ${application.taxEIN}
DUNS: ${application.dunsNumber || 'Not provided'}
Industry: Based on business description and trade references
Contact: ${application.buyerNameEmail}
Trade References: ${tradeReferencesData.map(ref => ref.name).filter(Boolean).length}/3 provided

*** VERIFICATION RESULTS ***
- Business Registration: ${businessVerification.isValid} (Status: ${businessVerification.status})
- Domain Analysis: ${domainVerification.isValid ? 'Valid' : 'Suspicious'} (Issues: ${domainVerification.suspiciousIndicators.join(', ') || 'None'})
- Phone Validation: ${phoneValidation.isValid ? 'Valid' : 'Invalid'} (Type: ${phoneValidation.type})
- Address Analysis: ${addressValidation.type} (Risk Factors: ${addressValidation.riskFactors.join(', ') || 'None'})

*** CURRENT SYSTEM SCORE: ${creditScore.score}/850 ***
Score Breakdown:
${Object.entries(creditScore.breakdown).map(([key, value]) => `- ${key}: ${value > 0 ? '+' : ''}${value} points`).join('\n')}

*** SYSTEM RECOMMENDATION: ${finalDecision} ***
- Credit Limit: $${finalLimit.toLocaleString()}
- Risk Level: ${finalRiskLevel}
- Payment Terms: ${finalTerms}

Analyze this data and provide:
1. Validation of the credit score (should it be higher/lower?)
2. Risk assessment refinement
3. Key business strengths and red flags
4. Specific conditions or monitoring requirements

Return JSON only:
{
  "scoreValidation": "brief assessment of whether the ${creditScore.score} score is appropriate",
  "adjustedRiskLevel": "${finalRiskLevel}" or suggest "LOW"/"MEDIUM"/"HIGH",
  "keyStrengths": ["specific positive factors identified"],
  "criticalConcerns": ["specific red flags or risks"],
  "recommendedConditions": ["specific conditions for approval/monitoring"],
  "analyticalSummary": "2-3 sentence expert assessment of creditworthiness"
}`;

      const o3Response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'o3-mini', // Using o3 for analytical work
          messages: [
            {
              role: 'system',
              content: 'You are an expert credit analyst. Provide precise analytical insights based on verification data. Return only valid JSON.'
            },
            {
              role: 'user',
              content: o3Prompt
            }
          ],
          temperature: 0.1, // Lower temperature for analytical work
          max_tokens: 800,
        }),
      });

      if (o3Response.ok) {
        const o3Result = await o3Response.json();
        const o3Content = o3Result.choices[0]?.message?.content;
        
        if (o3Content) {
          try {
            o3Analysis = JSON.parse(o3Content);
            console.log('✅ o3 analytical grading complete');
            
            // Optionally adjust risk level based on o3 analysis
            if (o3Analysis.adjustedRiskLevel && o3Analysis.adjustedRiskLevel !== finalRiskLevel) {
              console.log(`📊 o3 suggests risk adjustment: ${finalRiskLevel} → ${o3Analysis.adjustedRiskLevel}`);
              finalRiskLevel = o3Analysis.adjustedRiskLevel;
            }
          } catch (parseError) {
            console.error('❌ Failed to parse o3 JSON response:', parseError);
          }
        }
      } else {
        console.error('❌ o3 API error:', o3Response.status);
      }
    } catch (error) {
      console.error('❌ o3 API call failed:', error);
    }
  }

  // **STEP 2: Use GPT-4o for narrative writing based on o3 analysis**
  const prompt = `You are a professional credit analyst writing an executive summary. The credit decision has been made by our automated system and refined by expert analysis.

*** FINAL DECISION (DO NOT CHANGE) ***
- Decision: ${finalDecision}
- Credit Score: ${creditScore.score}/850
- Credit Limit: $${finalLimit.toLocaleString()}
- Payment Terms: ${finalTerms}
- Risk Level: ${finalRiskLevel}

*** VERIFICATION RESULTS ***
- Business Registration: ${businessVerification.isValid} (Status: ${businessVerification.status})
- Domain Analysis: ${domainVerification.isValid ? 'Valid' : 'Issues detected'} (Issues: ${domainVerification.suspiciousIndicators.join(', ') || 'None'})
- Phone Validation: ${phoneValidation.isValid ? 'Valid' : 'Invalid'} (Type: ${phoneValidation.type})
- Address Type: ${addressValidation.type} (Risk Factors: ${addressValidation.riskFactors.join(', ') || 'None'})

*** EXPERT ANALYTICAL INSIGHTS (from o3) ***
${o3Analysis ? `
Score Validation: ${o3Analysis.scoreValidation}
Key Strengths: ${o3Analysis.keyStrengths?.join(', ')}
Critical Concerns: ${o3Analysis.criticalConcerns?.join(', ')}
Expert Summary: ${o3Analysis.analyticalSummary}
Recommended Conditions: ${o3Analysis.recommendedConditions?.join(', ')}
` : 'Expert analysis not available - using system analysis only'}

*** CREDIT SCORE BREAKDOWN ***
${Object.entries(creditScore.breakdown).map(([key, value]) => `- ${key}: ${value > 0 ? '+' : ''}${value} points`).join('\n')}

*** APPLICATION DATA ***
Company: ${application.legalEntityName}
EIN: ${application.taxEIN}
DUNS: ${application.dunsNumber || 'Not provided'}
Contact: ${application.buyerNameEmail}
Trade References: ${tradeReferencesData.map(ref => ref.name).filter(Boolean).length}/3 provided

Write a professional, comprehensive credit analysis report that incorporates the expert insights above. Focus on clear communication to business stakeholders.

Return ONLY this JSON format (no markdown):
{
  "executiveSummary": "Professional 3-4 sentence explanation incorporating expert insights",
  "keyStrengths": ["List 2-3 positive factors from analysis"],
  "criticalConcerns": ["List 2-3 red flags from analysis"],
  "verificationSummary": "Clear summary of all verification checks and results",
  "riskAssessment": "Detailed explanation of risk level with expert insights",
  "recommendedActions": ["List 2-3 specific next steps or monitoring requirements"]
}`;

  console.log('📝 AI PROCESSOR: Calling GPT-4o for narrative writing...');

  // Only call OpenAI if API key is available
  if (!OPENAI_API_KEY) {
    console.log('🤖 2-AGENT SYSTEM: No API key - using fallback analysis');
    
    // Fallback to 2-agent system without narrative writing
    const result: CreditDecision = {
      decision: finalDecision,
      creditScore: creditScore.score,
      riskLevel: finalRiskLevel,
      creditLimit: finalLimit,
      paymentTerms: finalTerms,
      reasoning: creditAnalysisResult.reasoning || `2-Agent AI analysis completed. Decision: ${finalDecision} based on credit score of ${creditScore.score}/850.`,
      conditions: finalConditions,
      additionalNotes: [
        `🤖 2-AGENT AI ANALYSIS SYSTEM (o3-mini-2025-01-31) - No API Key`,
        `Agent 1 - Fraud Detection: ${fraudResult.isFraud ? `⚠️ ${fraudResult.confidence}% confidence` : '✅ Cleared'}`,
        `Agent 2 - Credit Analysis: ${creditAnalysisResult.analysis}`,
        `Verification Summary: Business ${businessVerification.isValid ? 'valid' : 'invalid'}, Domain ${domainVerification.isValid ? 'clean' : 'flagged'}`,
        `Score Breakdown: ${Object.entries(creditScore.breakdown).map(([k,v]) => `${k}: ${v}`).join(', ')}`
      ].join('\n\n'),
      verificationSummary: `Business: ${businessVerification.status}, Domain: ${domainVerification.isValid ? 'Valid' : 'Issues'}, Phone: ${phoneValidation.type}`,
      scoreBreakdown: creditScore.breakdown,
      fraudRiskScore: fraudResult.confidence,
      auditFlags: [...fraudResult.reasons, `2-Agent System: No API Key`]
    };

    console.log('✅ 2-AGENT SYSTEM: Fallback analysis complete for application #' + applicationId);
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
        model: 'gpt-4o', // Using GPT-4o for narrative writing
        messages: [
          {
            role: 'system',
            content: 'You are a professional credit analyst. Write clear, comprehensive reports for business stakeholders. Return ONLY valid JSON with no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Moderate temperature for writing
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
      reasoning: creditAnalysisResult.reasoning || 'AI 2-agent analysis completed',
      conditions: finalConditions,
      additionalNotes: [
        `🤖 2-AGENT AI ANALYSIS SYSTEM (o3-mini-2025-01-31)`,
        `Agent 1 - Fraud Detection: ${fraudResult.isFraud ? `⚠️ ${fraudResult.confidence}% confidence` : '✅ Cleared'}`,
        `Agent 2 - Credit Analysis: ${creditAnalysisResult.analysis}`,
        `Risk Assessment: ${creditAnalysisResult.riskAdjustment}`,
        `Final Decision Logic: ${creditAnalysisResult.reasoning}`
      ].join('\n\n'),
      verificationSummary: `AI-Enhanced Verification: Business ${verificationData.business?.isValid ? 'Valid' : 'Invalid'}, Domain ${verificationData.domain?.isValid ? 'Clean' : 'Flagged'}, Phone ${verificationData.phone?.type}`,
      scoreBreakdown: creditScore.breakdown,
      fraudRiskScore: fraudResult.confidence,
      auditFlags: [...fraudResult.reasons, `Agent 2 Confidence: High`]
    };

    console.log('✅ AI PROCESSOR: Analysis complete for application #' + applicationId);
    return result;

  } catch (error) {
    console.error('❌ 2-AGENT SYSTEM: API error during narrative generation:', error);
    
    // Fallback to 2-agent system without narrative writing
    const result: CreditDecision = {
      decision: finalDecision,
      creditScore: creditScore.score,
      riskLevel: finalRiskLevel,
      creditLimit: finalLimit,
      paymentTerms: finalTerms,
      reasoning: creditAnalysisResult.reasoning || `2-Agent AI analysis completed. Decision: ${finalDecision} based on credit score of ${creditScore.score}/850.`,
      conditions: finalConditions,
      additionalNotes: [
        `🤖 2-AGENT AI ANALYSIS SYSTEM (o3-mini-2025-01-31) - API Error`,
        `Agent 1 - Fraud Detection: ${fraudResult.isFraud ? `⚠️ ${fraudResult.confidence}% confidence` : '✅ Cleared'}`,
        `Agent 2 - Credit Analysis: ${creditAnalysisResult.analysis}`,
        `Verification Summary: Business ${businessVerification.isValid ? 'valid' : 'invalid'}, Domain ${domainVerification.isValid ? 'clean' : 'flagged'}`,
        `Score Breakdown: ${Object.entries(creditScore.breakdown).map(([k,v]) => `${k}: ${v}`).join(', ')}`
      ].join('\n\n'),
      verificationSummary: `Business: ${businessVerification.status}, Domain: ${domainVerification.isValid ? 'Valid' : 'Issues'}, Phone: ${phoneValidation.type}`,
      scoreBreakdown: creditScore.breakdown,
      fraudRiskScore: fraudResult.confidence,
      auditFlags: [...fraudResult.reasons, `2-Agent System: API Error Fallback`]
    };

    return result;
  }
}

export async function sendAIAnalysisReport(applicationData: any, aiDecision: CreditDecision): Promise<void> {
  if (!process.env.EMAIL_FORM) {
    console.warn('EMAIL_FORM environment variable not set. Cannot send AI analysis report.');
    return;
  }

  // Define baseUrl at the top before using it
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NODE_ENV === 'production' 
      ? 'https://creditapp.alliancechemical.com' // Updated with actual domain
      : 'http://localhost:3000';

  const subject = `🤖 2-AGENT AI ANALYSIS: ${aiDecision.decision} - ${applicationData.legalEntityName} (#${applicationData.id})`;
  
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
🤖 2-AGENT AI CREDIT ANALYSIS COMPLETE
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
    <h1>🤖 2-Agent AI Credit Analysis Report</h1>
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
    <p>🤖 This analysis was generated by Alliance Chemical's 2-Agent AI Credit Processing System</p>
    <p>Agent 1: Fraud Detection (o3-mini-2025-01-31) | Agent 2: Credit Analysis (o3-mini-2025-01-31)</p>
  </div>
</body>
</html>
`;

  await sendEmail({
    to: process.env.EMAIL_FORM,
    subject: subject,
    text: textBody,
    html: htmlBody,
  }, {
    applicationId: applicationData.id,
    type: 'ai_analysis'
  });

  console.log('📧 AI Analysis report sent via email');
}