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

// Initialize Microsoft Graph client
function initializeGraphClient(): Client | null {
  if (!MICROSOFT_GRAPH_CLIENT_ID || !MICROSOFT_GRAPH_CLIENT_SECRET || !MICROSOFT_GRAPH_TENANT_ID) {
    console.warn('Microsoft Graph credentials not configured. Email service will be disabled.');
    return null;
  }

  try {
    // Create credential using client secret
    const credential = new ClientSecretCredential(
      MICROSOFT_GRAPH_TENANT_ID,
      MICROSOFT_GRAPH_CLIENT_ID,
      MICROSOFT_GRAPH_CLIENT_SECRET
    );

    // Create Graph client with authentication
    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
          return tokenResponse?.token || '';
        }
      }
    });

    console.log('Microsoft Graph client initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize Microsoft Graph client:', error);
    return null;
  }
}

// Initialize client on module load
graphClient = initializeGraphClient();

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

  if (!graphClient) {
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
    // Send email using Microsoft Graph
    const result = await graphClient
      .api(`/users/${MICROSOFT_GRAPH_USER_EMAIL}/sendMail`)
      .post({
        message: message
      });

    console.log('✅ Microsoft Graph: Email sent successfully!');
    return { success: true, result };
  } catch (error) {
    console.error('❌ Microsoft Graph: Detailed error information:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Handle specific Graph API errors
    if (error && typeof error === 'object' && 'code' in error) {
      const graphError = error as any;
      console.error('❌ Microsoft Graph: API Error Code:', graphError.code);
      
      switch (graphError.code) {
        case 'Forbidden':
          console.error('❌ Microsoft Graph: Insufficient permissions. Check app registration permissions.');
          return { success: false, message: 'Insufficient permissions to send email. Check app registration permissions.', error };
        case 'Unauthorized':
          console.error('❌ Microsoft Graph: Authentication failed. Check client credentials.');
          return { success: false, message: 'Authentication failed. Check client credentials.', error };
        case 'MailboxNotEnabledForRESTAPI':
          console.error('❌ Microsoft Graph: Mailbox not enabled for REST API.');
          return { success: false, message: 'Mailbox not enabled for REST API. User needs a valid Exchange Online license.', error };
        default:
          console.error('❌ Microsoft Graph: Unknown API error:', graphError.code);
          return { success: false, message: `Graph API error: ${graphError.code}`, error };
      }
    }
    
    console.error('❌ Microsoft Graph: Non-Graph API error');
    return { success: false, message: 'Failed to send email via Microsoft Graph', error };
  }
}

export function isGraphConfigured(): boolean {
  return !!(MICROSOFT_GRAPH_CLIENT_ID && MICROSOFT_GRAPH_CLIENT_SECRET && MICROSOFT_GRAPH_TENANT_ID && MICROSOFT_GRAPH_USER_EMAIL);
} 