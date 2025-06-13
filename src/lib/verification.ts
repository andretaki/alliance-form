// External data verification services
// This module provides various verification capabilities to enhance credit analysis

interface DomainInfo {
  age: number | null;
  registrar: string | null;
  isValid: boolean;
  suspiciousIndicators: string[];
}

interface BusinessVerification {
  isValid: boolean;
  stateRegistered: string | null;
  entityType: string | null;
  registrationDate: string | null;
  status: string | null;
  verificationSource: string;
}

// Domain age and registration verification
export async function verifyDomain(email: string): Promise<DomainInfo> {
  try {
    const domain = email.split('@')[1];
    if (!domain) {
      return { age: null, registrar: null, isValid: false, suspiciousIndicators: ['Invalid email format'] };
    }

    const suspiciousIndicators: string[] = [];
    
    // Check for suspicious domain patterns
    const suspiciousPatterns = [
      /test/i, /demo/i, /example/i, /temp/i, /fake/i, 
      /^[a-z]{1,3}[0-9]+\./i, // Short random domains
      /gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i // Personal email domains
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(domain)) {
        if (/gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i.test(domain)) {
          suspiciousIndicators.push('Personal email domain (not business)');
        } else {
          suspiciousIndicators.push('Suspicious domain pattern detected');
        }
      }
    }

    // In a real implementation, you'd call external APIs like:
    // - whois.net API
    // - DomainTools API
    // - SecurityTrails API
    
    // For now, return mock data based on domain analysis
    const mockAge = domain.includes('test') ? 1 : Math.floor(Math.random() * 3650) + 365; // 1-10 years
    
    return {
      age: mockAge,
      registrar: domain.includes('test') ? 'Unknown' : 'GoDaddy LLC',
      isValid: !domain.includes('test'),
      suspiciousIndicators
    };
    
  } catch (error) {
    console.error('Domain verification error:', error);
    return { age: null, registrar: null, isValid: false, suspiciousIndicators: ['Verification failed'] };
  }
}

// Business registration verification
export async function verifyBusiness(companyName: string, ein: string, state?: string): Promise<BusinessVerification> {
  try {
    // In a real implementation, you'd integrate with:
    // - Secretary of State APIs
    // - D&B API
    // - IRS Business Master File
    // - OpenCorporates API
    
    const suspiciousNames = ['test', 'demo', 'example', 'fake', 'temp'];
    const isTest = suspiciousNames.some(word => companyName.toLowerCase().includes(word));
    
    if (isTest) {
      return {
        isValid: false,
        stateRegistered: null,
        entityType: null,
        registrationDate: null,
        status: 'NOT FOUND',
        verificationSource: 'Mock Verification'
      };
    }

    // Mock successful verification for non-test companies
    return {
      isValid: true,
      stateRegistered: state || 'TX',
      entityType: 'Limited Liability Company',
      registrationDate: '2018-03-15',
      status: 'ACTIVE',
      verificationSource: 'Mock Verification'
    };
    
  } catch (error) {
    console.error('Business verification error:', error);
    return {
      isValid: false,
      stateRegistered: null,
      entityType: null,
      registrationDate: null,
      status: 'VERIFICATION FAILED',
      verificationSource: 'Error'
    };
  }
}

// Phone number validation
export function validatePhoneNumber(phone: string): { isValid: boolean; type: string; location: string | null } {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return { isValid: false, type: 'Invalid', location: null };
  }
  
  const areaCode = cleaned.length === 11 ? cleaned.substring(1, 4) : cleaned.substring(0, 3);
  
  // Mock area code validation
  const businessAreaCodes = ['713', '281', '832', '214', '469', '972', '512', '737', '361'];
  const isBusiness = businessAreaCodes.includes(areaCode);
  
  return {
    isValid: true,
    type: isBusiness ? 'Business' : 'Residential/Mobile',
    location: areaCode === '713' || areaCode === '281' || areaCode === '832' ? 'Houston, TX' : 'Other'
  };
}

// Address validation
export function validateAddress(address: string): { isValid: boolean; type: string; riskFactors: string[] } {
  const riskFactors: string[] = [];
  
  // Check for PO Box
  if (/p\.?o\.?\s*box/i.test(address)) {
    riskFactors.push('PO Box address (no physical location)');
  }
  
  // Check for residential indicators
  if (/apt|apartment|unit|#\d+/i.test(address)) {
    riskFactors.push('Possible residential address');
  }
  
  // Check for industrial/business indicators
  const businessKeywords = ['industrial', 'suite', 'floor', 'building', 'plaza', 'center', 'blvd', 'ave'];
  const hasBusinessIndicators = businessKeywords.some(keyword => 
    address.toLowerCase().includes(keyword)
  );
  
  return {
    isValid: address.length > 10,
    type: hasBusinessIndicators ? 'Commercial' : 'Residential/Unknown',
    riskFactors
  };
}

// Credit score calculation with external data
export function calculateEnhancedCreditScore(applicationData: any, verificationData: any): {
  score: number;
  breakdown: Record<string, number>;
  reasoning: string[];
} {
  let score = 600; // Base score
  const breakdown: Record<string, number> = {};
  const reasoning: string[] = [];
  
  // **CRITICAL VERIFICATION FAILURES - MAJOR PENALTIES**
  
  // Business verification - MASSIVE penalty for test/fake companies
  if (!verificationData.business?.isValid) {
    const businessScore = -200; // HUGE penalty for invalid business
    breakdown['Business Registration'] = businessScore;
    score += businessScore;
    reasoning.push(`INVALID BUSINESS REGISTRATION: ${businessScore} points - MAJOR RED FLAG`);
  } else {
    const businessScore = 60;
    breakdown['Business Registration'] = businessScore;
    score += businessScore;
    reasoning.push(`Valid business registration: +${businessScore} points`);
  }
  
  // Domain verification - BIG penalty for suspicious domains
  if (!verificationData.domain?.isValid || verificationData.domain?.suspiciousIndicators?.length > 0) {
    const domainScore = -100; // Big penalty for bad domains
    breakdown['Domain Verification'] = domainScore;
    score += domainScore;
    reasoning.push(`SUSPICIOUS DOMAIN (${verificationData.domain?.suspiciousIndicators?.join(', ')}): ${domainScore} points`);
  } else {
    const domainScore = 30;
    breakdown['Domain Verification'] = domainScore;
    score += domainScore;
    reasoning.push(`Valid domain: +${domainScore} points`);
  }
  
  // Test company detection - INSTANT FAIL
  const companyName = applicationData.legalEntityName?.toLowerCase() || '';
  const email = applicationData.buyerNameEmail?.toLowerCase() || '';
  const testIndicators = ['test', 'demo', 'example', 'fake', 'temp'];
  const isTestCompany = testIndicators.some(indicator => 
    companyName.includes(indicator) || email.includes(indicator)
  );
  
  if (isTestCompany) {
    const testPenalty = -300; // MASSIVE penalty
    breakdown['Test Company Detection'] = testPenalty;
    score += testPenalty;
    reasoning.push(`TEST/FAKE COMPANY DETECTED: ${testPenalty} points - AUTOMATIC HIGH RISK`);
  }
  
  // Application completeness
  const completenessScore = applicationData.dunsNumber ? 50 : 20;
  breakdown['Application Completeness'] = completenessScore;
  score += completenessScore;
  reasoning.push(`Application completeness: +${completenessScore} points`);
  
  // DUNS provided
  const dunsScore = applicationData.dunsNumber ? 40 : -40;
  breakdown['DUNS Verification'] = dunsScore;
  score += dunsScore;
  reasoning.push(`DUNS ${applicationData.dunsNumber ? 'provided' : 'missing'}: ${dunsScore > 0 ? '+' : ''}${dunsScore} points`);
  
  // Trade references
  const tradeRefCount = [applicationData.trade1Name, applicationData.trade2Name, applicationData.trade3Name]
    .filter(Boolean).length;
  const tradeScore = tradeRefCount * 20;
  breakdown['Trade References'] = tradeScore;
  score += tradeScore;
  reasoning.push(`Trade references (${tradeRefCount}/3): +${tradeScore} points`);
  
  // Address consistency
  const addressScore = applicationData.billToAddress === applicationData.shipToAddress ? 20 : 10;
  breakdown['Address Consistency'] = addressScore;
  score += addressScore;
  reasoning.push(`Address consistency: +${addressScore} points`);
  
  // *** FIX: Ensure score can drop low but not go below a reasonable minimum ***
  score = Math.max(150, Math.min(850, Math.round(score)));
  
  return { score, breakdown, reasoning };
} 