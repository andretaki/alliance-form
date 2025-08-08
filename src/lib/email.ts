import { sendEmailViaGraph, isGraphConfigured, verifyGraphConfiguration } from '@/lib/microsoft-graph';
import { queueEmail, processEmailQueue, checkKVConnection } from '@/lib/email-queue';

// Quick fix - Force Direct Send
const FORCE_DIRECT_SEND = true; // Temporary flag

// Validate critical email configuration in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.EMAIL_FORM) {
    const message = 'FATAL ERROR: EMAIL_FORM environment variable is required in production for sending form submissions.';
    console.error(message);
    throw new Error(message);
  }
}

interface EmailDataBase {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  cc?: string;
}

interface ApplicationData {
  id?: number;
  legalEntityName?: string;
  dba?: string;
  taxEIN?: string;
  dunsNumber?: string;
  phoneNo?: string;
  billToAddress?: string;
  billToCity?: string;
  billToState?: string;
  billToZip?: string;
  billToCityStateZip?: string; // Keep for backward compatibility
  shipToAddress?: string;
  shipToCity?: string;
  shipToState?: string;
  shipToZip?: string;
  shipToCityStateZip?: string; // Keep for backward compatibility
  buyerNameEmail?: string;
  accountsPayableNameEmail?: string;
  wantInvoicesEmailed?: boolean;
  invoiceEmail?: string;
  trade1Name?: string;
  trade1Address?: string;
  trade1City?: string;
  trade1State?: string;
  trade1Zip?: string;
  trade1CityStateZip?: string; // Keep for backward compatibility
  trade1Attn?: string;
  trade1Email?: string;
  trade1FaxNo?: string;
  trade1Phone?: string;
  trade2Name?: string;
  trade2Address?: string;
  trade2City?: string;
  trade2State?: string;
  trade2Zip?: string;
  trade2CityStateZip?: string; // Keep for backward compatibility
  trade2Attn?: string;
  trade2Email?: string;
  trade2FaxNo?: string;
  trade2Phone?: string;
  trade3Name?: string;
  trade3Address?: string;
  trade3City?: string;
  trade3State?: string;
  trade3Zip?: string;
  trade3CityStateZip?: string; // Keep for backward compatibility
  trade3Attn?: string;
  trade3Email?: string;
  trade3FaxNo?: string;
  trade3Phone?: string;
  termsAgreed?: boolean;
}



// Track KV availability globally
let kvLastCheckTime = 0;
let kvIsAvailable: boolean | null = null;
const KV_CHECK_INTERVAL = 60000; // 1 minute

async function shouldUseQueue(): Promise<boolean> {
  // Check if we should even attempt to use the queue
  const now = Date.now();
  
  // Use cached result if recent
  if (kvIsAvailable !== null && (now - kvLastCheckTime) < KV_CHECK_INTERVAL) {
    return kvIsAvailable;
  }
  
  // Check KV health
  try {
    console.log('🔍 Checking if KV queue should be used...');
    kvIsAvailable = await checkKVConnection();
    kvLastCheckTime = now;
    console.log(`📊 KV queue available: ${kvIsAvailable}`);
    return kvIsAvailable;
  } catch (error) {
    console.error('❌ KV health check failed:', error);
    kvIsAvailable = false;
    kvLastCheckTime = now;
    return false;
  }
}

// Enhanced fallback with multiple options
async function sendEmailFallback(data: EmailDataBase) {
  console.log('📧 FALLBACK: Attempting alternative email methods...');
  
  // Log email for debugging
  console.log('📧 EMAIL DETAILS:', {
    to: data.to,
    subject: data.subject,
    from: data.from || 'noreply@alliancechemical.com',
    preview: data.text.substring(0, 100) + '...'
  });
  
  // Try webhook service first
  if (process.env.WEBHOOK_EMAIL_URL) {
    try {
      console.log('📧 FALLBACK: Trying webhook email service...');
      
      const response = await fetch(process.env.WEBHOOK_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_EMAIL_TOKEN || ''}`
        },
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          html: data.html,
          text: data.text,
          from: data.from || 'noreply@alliancechemical.com',
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('✅ FALLBACK: Email sent via webhook');
        return { 
          success: true, 
          message: 'Email sent via webhook service' 
        };
      } else {
        const error = await response.text();
        console.warn('⚠️ FALLBACK: Webhook failed:', error);
      }
    } catch (error) {
      console.error('❌ FALLBACK: Webhook error:', error);
    }
  }
  
  // Try Vercel Edge Function if available
  if (process.env.VERCEL_URL && process.env.EDGE_EMAIL_FUNCTION) {
    try {
      console.log('📧 FALLBACK: Trying Vercel Edge Function...');
      
      const response = await fetch(`https://${process.env.VERCEL_URL}/api/edge-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log('✅ FALLBACK: Email sent via Edge Function');
        return { 
          success: true, 
          message: 'Email sent via Edge Function' 
        };
      }
    } catch (error) {
      console.error('❌ FALLBACK: Edge Function error:', error);
    }
  }
  
  // Log to console and return success (to not break the app)
  console.log('📧 FALLBACK: Email logged to console');
  console.log('========== EMAIL CONTENT ==========');
  console.log('To:', data.to);
  console.log('Subject:', data.subject);
  console.log('From:', data.from || 'noreply@alliancechemical.com');
  console.log('Text:', data.text);
  console.log('===================================');
  
  // Store in KV as last resort if available
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(`email_fallback_${Date.now()}`, {
      ...data,
      timestamp: new Date().toISOString(),
      status: 'logged'
    }, { ex: 86400 });
    console.log('💾 Email stored in KV for later retrieval');
  } catch (kvError) {
    console.warn('⚠️ Could not store email in KV:', kvError);
  }
  
  return { 
    success: true, 
    message: 'Email logged - configure email service for actual sending',
    warning: 'No email service configured. Email was logged but not sent.'
  };
}

export async function sendEmail(data: EmailDataBase, options?: {
  applicationId?: number;
  type?: 'application_summary' | 'ai_analysis' | 'approval_notification' | 'test';
  immediate?: boolean; // Skip queue for immediate sending
}) {
  console.log('📧 Email Service: Starting email send process');
  console.log(`📧 Email type: ${options?.type || 'test'}, Immediate: ${options?.immediate || false}`);
  
  const emailType = options?.type || 'test';
  const useQueue = !options?.immediate && !FORCE_DIRECT_SEND;
  
  // Try to use queue if not immediate and not forced to direct send
  if (useQueue) {
    const kvAvailable = await shouldUseQueue();
    
    if (kvAvailable) {
    try {
        console.log('📬 Attempting to queue email via Vercel KV...');
        
      const emailId = await queueEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        from: data.from,
        applicationId: options?.applicationId,
        type: emailType
      });
      
      console.log(`✅ Email queued successfully: ${emailId}`);
      
        // For Vercel, we can't reliably trigger background processing
        // The queue will be processed by:
        // 1. A separate cron job (recommended)
        // 2. The next API call to /api/process-emails
        // 3. Manual trigger
        console.log('💡 Email queued. Will be processed by cron job or next queue processing trigger.');
        
        // Try to process queue in a non-blocking way
        // This is best-effort and may not work in all Vercel deployments
        if (process.env.NODE_ENV === 'production') {
          // In production, rely on external triggers (cron, etc.)
          console.log('📌 Production mode: Relying on external queue processor');
        } else {
          // In development, try to process immediately
          setTimeout(() => {
            processEmailQueue().catch(err => {
              console.warn('⚠️ Background queue processing failed:', err);
            });
          }, 100);
        }
      
      return { 
        success: true, 
        message: 'Email queued for sending',
          emailId: emailId,
          note: 'Email will be sent within 1-2 minutes via queue processor'
      };
        
    } catch (queueError) {
        console.error('❌ Failed to queue email:', queueError);
        console.log('📧 Falling back to direct send...');
        
        // Mark KV as unavailable for future requests
        kvIsAvailable = false;
        kvLastCheckTime = Date.now();
        
      // Fall through to direct sending
      }
    } else {
      console.log('⚠️ KV queue not available, using direct send');
    }
  }
  
  // Direct sending (immediate mode or fallback)
  console.log('📧 Using direct email sending...');
  
  // Check Microsoft Graph configuration
  const configCheck = verifyGraphConfiguration();
  console.log('🔍 Microsoft Graph Configuration:', {
    isValid: configCheck.isValid,
    issues: configCheck.issues.length
  });

  if (!configCheck.isValid) {
    console.error('❌ Microsoft Graph configuration invalid:', configCheck.issues);
    return await sendEmailFallback(data);
  }

  try {
    console.log('🔄 Sending email via Microsoft Graph...');
    
    // Add timeout for the entire email send process
    const emailPromise = sendEmailViaGraph(data);
    const emailTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Email send timeout after 20 seconds')), 20000);
    });
    
    const result = await Promise.race([emailPromise, emailTimeout]);
    
    if (result.success) {
      console.log('✅ Email sent successfully via Microsoft Graph');
      return result;
    } else {
      console.error('❌ Microsoft Graph failed:', result.message);
      return await sendEmailFallback(data);
    }
  } catch (error) {
    console.error('❌ Email service error:', error);
    return await sendEmailFallback(data);
  }
}

export async function sendApplicationSummary(applicationData: ApplicationData) {
  // Send application summaries to sales team, not andre
  // AI analysis/approval emails still go to EMAIL_FORM (andre@alliancechemical.com)
  const salesEmail = process.env.SALES_EMAIL || 'sales@alliancechemical.com';

  const subject = `[New Credit App] ${applicationData.legalEntityName} (ID: ${applicationData.id || 'N/A'})`;
  
  // Simplified text body - NO AI ANALYSIS (this goes to sales team)
  const textBody = `
A new customer credit application has been received and is being processed by our AI system.

Company: ${applicationData.legalEntityName}
Application ID: ${applicationData.id || 'N/A'}
Submission Date: ${new Date().toISOString()}

🤖 AI PROCESSING STATUS: In progress...
Andre will receive a separate AI credit analysis report for approval/denial within 1-2 minutes.

The application details are included below for your review.
`;

  // Simplified HTML body - NO AI ANALYSIS
  const htmlBody = `
<html>
<body style="font-family: sans-serif; line-height: 1.5;">
  <h1>New Customer Application Received</h1>
  <p>A new application from <strong>${applicationData.legalEntityName}</strong> (ID: #${applicationData.id || 'N/A'}) is being processed by our AI system.</p>
  <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 15px 0;">
    <p style="margin: 0; color: #1e40af;"><strong>🤖 AI PROCESSING STATUS:</strong> In progress...</p>
    <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 14px;">Andre will receive a separate AI credit analysis report for approval/denial within 1-2 minutes.</p>
  </div>
  <p>The application details are included below for your review and processing.</p>
  <hr>
  <h3>Submission Details:</h3>
  <ul>
    <li><strong>Legal Entity Name:</strong> ${applicationData.legalEntityName}</li>
    <li><strong>Buyer Contact:</strong> ${applicationData.buyerNameEmail}</li>
    <li><strong>Tax EIN:</strong> ${applicationData.taxEIN}</li>
    <li><strong>Phone:</strong> ${applicationData.phoneNo}</li>
    <li><strong>Billing Address:</strong> ${applicationData.billToAddress}</li>
    <li><strong>DBA:</strong> ${applicationData.dba || 'N/A'}</li>
    <li><strong>DUNS Number:</strong> ${applicationData.dunsNumber || 'N/A'}</li>
  </ul>
  <h3>Additional Information:</h3>
  <ul>
    <li><strong>Accounts Payable Contact:</strong> ${applicationData.accountsPayableNameEmail || 'N/A'}</li>
    <li><strong>Wants Invoices Emailed:</strong> ${applicationData.wantInvoicesEmailed ? 'Yes' : 'No'}</li>
    <li><strong>Invoice Email:</strong> ${applicationData.invoiceEmail || 'N/A'}</li>
    <li><strong>Terms Agreement:</strong> ${applicationData.termsAgreed ? 'Signed' : 'Not Signed'}</li>
  </ul>
</body>
</html>
`;

  await sendEmail({
    to: salesEmail,
    subject: subject,
    text: textBody,
    html: htmlBody,
  }, {
    applicationId: applicationData.id,
    type: 'application_summary'
  });
}

 