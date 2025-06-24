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
  if (!graphClient) {
    console.warn('Microsoft Graph not configured. Skipping email send for:', data.subject);
    return { success: false, message: 'Microsoft Graph service not configured' };
  }

  if (!MICROSOFT_GRAPH_USER_EMAIL) {
    console.error('MICROSOFT_GRAPH_USER_EMAIL not configured');
    return { success: false, message: 'Sender email not configured' };
  }

  try {
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

    // Send email using Microsoft Graph
    const result = await graphClient
      .api(`/users/${MICROSOFT_GRAPH_USER_EMAIL}/sendMail`)
      .post({
        message: message
      });

    console.log('Email sent successfully via Microsoft Graph');
    return { success: true, result };
  } catch (error) {
    console.error('Error sending email via Microsoft Graph:', error);
    
    // Handle specific Graph API errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch ((error as any).code) {
        case 'Forbidden':
          return { success: false, message: 'Insufficient permissions to send email. Check app registration permissions.', error };
        case 'Unauthorized':
          return { success: false, message: 'Authentication failed. Check client credentials.', error };
        case 'MailboxNotEnabledForRESTAPI':
          return { success: false, message: 'Mailbox not enabled for REST API. User needs a valid Exchange Online license.', error };
        default:
          return { success: false, message: `Graph API error: ${(error as any).code}`, error };
      }
    }
    
    return { success: false, message: 'Failed to send email via Microsoft Graph', error };
  }
}

export function isGraphConfigured(): boolean {
  return !!(MICROSOFT_GRAPH_CLIENT_ID && MICROSOFT_GRAPH_CLIENT_SECRET && MICROSOFT_GRAPH_TENANT_ID && MICROSOFT_GRAPH_USER_EMAIL);
} 