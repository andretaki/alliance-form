import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { 
  MICROSOFT_GRAPH_CLIENT_ID, 
  MICROSOFT_GRAPH_CLIENT_SECRET, 
  MICROSOFT_GRAPH_TENANT_ID,
  MICROSOFT_GRAPH_USER_EMAIL 
} from '@/lib/config';

interface GraphEmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

let graphClient: Client | null = null;
let credential: ClientSecretCredential | null = null;

// Direct HTTP token acquisition for better serverless reliability
async function getTokenDirectly(): Promise<string | null> {
  try {
    console.log('🔄 Direct token: Making HTTP request to Azure...');
    
    const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_GRAPH_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: MICROSOFT_GRAPH_CLIENT_ID!,
      client_secret: MICROSOFT_GRAPH_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    // Increased timeout for Fluid Compute
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Direct token: Request timed out after 20 seconds');
      controller.abort();
    }, 20000); // Increased for Fluid Compute

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache', // Prevent caching issues
      },
      body: params,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Direct token: HTTP error:', response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    
    if (tokenData.access_token) {
      console.log('✅ Direct token: Successfully obtained token');
      return tokenData.access_token;
    } else {
      console.error('❌ Direct token: No access_token in response:', tokenData);
      return null;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('❌ Token request aborted due to timeout');
    }
    console.error('❌ Direct token: Request failed:', error);
    return null;
  }
}

// Initialize Microsoft Graph client optimized for Vercel serverless
function initializeGraphClient(): Client | null {
  if (!MICROSOFT_GRAPH_CLIENT_ID || !MICROSOFT_GRAPH_CLIENT_SECRET || !MICROSOFT_GRAPH_TENANT_ID) {
    console.warn('Microsoft Graph credentials not configured. Email service will be disabled.');
    return null;
  }

  try {
    // Create credential with shorter timeout for serverless
    credential = new ClientSecretCredential(
      MICROSOFT_GRAPH_TENANT_ID,
      MICROSOFT_GRAPH_CLIENT_ID,
      MICROSOFT_GRAPH_CLIENT_SECRET,
      {
        authorityHost: 'https://login.microsoftonline.com',
        additionallyAllowedTenants: ['*']
      }
    );

    // Create Graph client optimized for serverless
    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          try {
            console.log('🔑 Microsoft Graph: Getting access token...');
            console.log('🔍 Microsoft Graph: Credential config check:', {
              tenantId: MICROSOFT_GRAPH_TENANT_ID?.substring(0, 8) + '...',
              clientId: MICROSOFT_GRAPH_CLIENT_ID?.substring(0, 8) + '...',
              hasSecret: !!MICROSOFT_GRAPH_CLIENT_SECRET
            });
            
            // Try direct HTTP approach first (more reliable in serverless)
            console.log('🔄 Microsoft Graph: Trying direct HTTP token request...');
            const directTokenResult = await getTokenDirectly();
            if (directTokenResult) {
              console.log('✅ Microsoft Graph: Access token obtained via direct HTTP');
              return directTokenResult;
            }
            
            // Fall back to Azure SDK with aggressive timeout
            console.log('⚠️ Microsoft Graph: Direct HTTP failed, trying Azure SDK...');
            const tokenPromise = credential!.getToken('https://graph.microsoft.com/.default');
            const tokenTimeout = new Promise<never>((_, reject) => {
              setTimeout(() => {
                console.error('⏰ Microsoft Graph: Token acquisition timed out after 3 seconds');
                reject(new Error('Token acquisition timeout after 3 seconds'));
              }, 3000);
            });
            
            console.log('⏳ Microsoft Graph: Waiting for token response...');
            const tokenResponse = await Promise.race([tokenPromise, tokenTimeout]);
            
            if (!tokenResponse?.token) {
              console.error('❌ Microsoft Graph: No token received in response');
              throw new Error('No token received from Azure');
            }
            
            console.log('✅ Microsoft Graph: Access token obtained successfully');
            return tokenResponse.token;
          } catch (tokenError) {
            console.error('❌ Microsoft Graph: Token acquisition failed:', {
              error: tokenError,
              message: tokenError instanceof Error ? tokenError.message : 'Unknown token error',
              name: tokenError instanceof Error ? tokenError.name : 'Unknown',
              stack: tokenError instanceof Error ? tokenError.stack?.substring(0, 200) : 'No stack'
            });
            throw tokenError;
          }
        }
      },
      // Add request timeout for Vercel
      defaultVersion: 'v1.0',
      debugLogging: process.env.NODE_ENV === 'development'
    });

    console.log('Microsoft Graph client initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize Microsoft Graph client:', error);
    return null;
  }
}

// Lazy initialization for serverless
function getGraphClient(): Client | null {
  if (!graphClient) {
    graphClient = initializeGraphClient();
  }
  return graphClient;
}

export async function sendEmailViaGraph(data: GraphEmailData): Promise<{success: boolean, result?: any, message?: string, error?: any}> {
  console.log('🔍 Microsoft Graph: Starting email send process');
  console.log('🔍 Microsoft Graph: Configuration check:', {
    hasClientId: !!MICROSOFT_GRAPH_CLIENT_ID,
    hasClientSecret: !!MICROSOFT_GRAPH_CLIENT_SECRET,  
    hasTenantId: !!MICROSOFT_GRAPH_TENANT_ID,
    hasUserEmail: !!MICROSOFT_GRAPH_USER_EMAIL,
    to: data.to,
    subject: data.subject
  });

  // Add overall timeout for the entire email send process
  const overallTimeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.error('⏰ Microsoft Graph: Overall email send process timed out after 10 seconds');
      reject(new Error('Overall Microsoft Graph process timeout'));
    }, 10000);
  });

  try {
    const emailSendProcess = async () => {
      const client = getGraphClient();
      if (!client) {
        console.warn('❌ Microsoft Graph not configured. Skipping email send for:', data.subject);
        return { success: false, message: 'Microsoft Graph service not configured' };
      }

      if (!MICROSOFT_GRAPH_USER_EMAIL) {
        console.error('❌ MICROSOFT_GRAPH_USER_EMAIL not configured');
        return { success: false, message: 'Sender email not configured' };
      }

      return await sendEmailInternal(client, data);
    };

    return await Promise.race([emailSendProcess(), overallTimeoutPromise]);
  } catch (error) {
    console.error('❌ Microsoft Graph: Process failed with timeout or error:', error);
    return { success: false, message: 'Microsoft Graph process failed or timed out', error };
  }
}

async function sendEmailInternal(client: Client, data: GraphEmailData): Promise<{success: boolean, result?: any, message?: string, error?: any}> {
  try {
    console.log('🔄 Microsoft Graph: Preparing email message...');
    // Prepare email message using personal mailbox (andre@alliancechemical.com)
    const message = {
      subject: data.subject,
      body: {
        contentType: 'HTML' as const,
        content: data.html
      },
      toRecipients: [
        {
          emailAddress: {
            address: data.to
          }
        }
      ],
      from: {
        emailAddress: {
          address: MICROSOFT_GRAPH_USER_EMAIL // Should be andre@alliancechemical.com
        }
      }
    };

    console.log('🔄 Microsoft Graph: Calling API to send email...');
    
    // Add shorter timeout for Vercel serverless environment
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Microsoft Graph API timeout after 8 seconds')), 8000);
    });

    // Send email using Microsoft Graph with timeout and retry
    const sendEmail = async () => {
      return await client
        .api(`/users/${MICROSOFT_GRAPH_USER_EMAIL}/sendMail`)
        .post({
          message: message,
          saveToSentItems: false // Optimize for serverless
        });
    };

    const result = await Promise.race([sendEmail(), timeoutPromise]);

    console.log('✅ Microsoft Graph: Email sent successfully!');
    return { success: true, result };
  } catch (error) {
    console.error('❌ Microsoft Graph: Detailed error information:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'Unknown'
    });
    
    // Handle timeout specifically
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('⏰ Microsoft Graph: API call timed out (Vercel serverless limitation)');
      return { success: false, message: 'Microsoft Graph API timed out - try refreshing the app registration', error };
    }
    
    // Handle specific Graph API errors
    if (error && typeof error === 'object' && 'code' in error) {
      const graphError = error as any;
      console.error('❌ Microsoft Graph: API Error Code:', graphError.code);
      console.error('❌ Microsoft Graph: API Error Details:', graphError);
      
      switch (graphError.code) {
        case 'Forbidden':
        case 'Authorization_RequestDenied':
          console.error('❌ Microsoft Graph: Insufficient permissions. Check app registration permissions.');
          console.error('❌ Required permissions: Mail.Send (Application)');
          return { success: false, message: 'Insufficient permissions. Need Mail.Send application permission with admin consent.', error };
        case 'Unauthorized':
        case 'InvalidAuthenticationToken':
          console.error('❌ Microsoft Graph: Authentication failed. Check client credentials.');
          return { success: false, message: 'Authentication failed. Check MICROSOFT_GRAPH_* environment variables.', error };
        case 'MailboxNotEnabledForRESTAPI':
          console.error('❌ Microsoft Graph: Mailbox not enabled for REST API.');
          return { success: false, message: 'Mailbox not enabled for REST API. User needs Exchange Online license.', error };
        case 'ResourceNotFound':
          console.error('❌ Microsoft Graph: User not found or no mailbox.');
          return { success: false, message: 'User not found. Check MICROSOFT_GRAPH_USER_EMAIL value.', error };
        default:
          console.error('❌ Microsoft Graph: Unknown API error:', graphError.code);
          return { success: false, message: `Graph API error: ${graphError.code} - ${graphError.message || 'Unknown error'}`, error };
      }
    }
    
    console.error('❌ Microsoft Graph: Non-Graph API error');
    return { success: false, message: 'Failed to send email via Microsoft Graph', error };
  }
}

export function isGraphConfigured(): boolean {
  return !!(MICROSOFT_GRAPH_CLIENT_ID && MICROSOFT_GRAPH_CLIENT_SECRET && MICROSOFT_GRAPH_TENANT_ID && MICROSOFT_GRAPH_USER_EMAIL);
}

export function verifyGraphConfiguration(): { 
  isValid: boolean; 
  issues: string[]; 
  config: Record<string, boolean> 
} {
  const issues: string[] = [];
  const config = {
    hasClientId: !!MICROSOFT_GRAPH_CLIENT_ID,
    hasClientSecret: !!MICROSOFT_GRAPH_CLIENT_SECRET,
    hasTenantId: !!MICROSOFT_GRAPH_TENANT_ID,
    hasUserEmail: !!MICROSOFT_GRAPH_USER_EMAIL
  };

  if (!MICROSOFT_GRAPH_CLIENT_ID) issues.push('MICROSOFT_GRAPH_CLIENT_ID is missing');
  if (!MICROSOFT_GRAPH_CLIENT_SECRET) issues.push('MICROSOFT_GRAPH_CLIENT_SECRET is missing');  
  if (!MICROSOFT_GRAPH_TENANT_ID) issues.push('MICROSOFT_GRAPH_TENANT_ID is missing');
  if (!MICROSOFT_GRAPH_USER_EMAIL) issues.push('MICROSOFT_GRAPH_USER_EMAIL is missing');

  // Validate format
  if (MICROSOFT_GRAPH_CLIENT_ID && !MICROSOFT_GRAPH_CLIENT_ID.match(/^[a-f0-9-]{36}$/i)) {
    issues.push('MICROSOFT_GRAPH_CLIENT_ID format invalid (should be GUID)');
  }
  if (MICROSOFT_GRAPH_TENANT_ID && !MICROSOFT_GRAPH_TENANT_ID.match(/^[a-f0-9-]{36}$/i)) {
    issues.push('MICROSOFT_GRAPH_TENANT_ID format invalid (should be GUID)');
  }
  if (MICROSOFT_GRAPH_USER_EMAIL && !MICROSOFT_GRAPH_USER_EMAIL.includes('@')) {
    issues.push('MICROSOFT_GRAPH_USER_EMAIL format invalid (should be email)');
  }

  return {
    isValid: issues.length === 0,
    issues,
    config
  };
} 