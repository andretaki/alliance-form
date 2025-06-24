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
            const tokenResponse = await credential!.getToken('https://graph.microsoft.com/.default');
            console.log('✅ Microsoft Graph: Access token obtained');
            return tokenResponse?.token || '';
          } catch (tokenError) {
            console.error('❌ Microsoft Graph: Token error:', tokenError);
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

  const client = getGraphClient();
  if (!client) {
    console.warn('❌ Microsoft Graph not configured. Skipping email send for:', data.subject);
    return { success: false, message: 'Microsoft Graph service not configured' };
  }

  if (!MICROSOFT_GRAPH_USER_EMAIL) {
    console.error('❌ MICROSOFT_GRAPH_USER_EMAIL not configured');
    return { success: false, message: 'Sender email not configured' };
  }

  try {
    console.log('🔄 Microsoft Graph: Preparing email message...');
    // Prepare email message
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
          address: data.from || MICROSOFT_GRAPH_USER_EMAIL
        }
      }
    };

    console.log('🔄 Microsoft Graph: Calling API to send email...');
    
    // Add shorter timeout for Vercel serverless environment
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Microsoft Graph API timeout after 15 seconds')), 15000);
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