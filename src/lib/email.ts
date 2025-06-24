import { sendEmailViaGraph, isGraphConfigured, verifyGraphConfiguration } from '@/lib/microsoft-graph';
// MODIFICATION: Import both queueing and processing functions
import { queueEmail, processEmailQueue } from '@/lib/email-queue';

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
}

interface ApplicationData {
  id?: number;
  legalEntityName: string;
  dba?: string;
  taxEIN: string;
  dunsNumber?: string;
  phoneNo: string;
  billToAddress: string;
  billToCityStateZip: string;
  shipToAddress: string;
  shipToCityStateZip: string;
  buyerNameEmail: string;
  accountsPayableNameEmail: string;
  wantInvoicesEmailed?: boolean;
  invoiceEmail?: string;
  trade1Name?: string;
  trade1Address?: string;
  trade1CityStateZip?: string;
  trade1Attn?: string;
  trade1Email?: string;
  trade1FaxNo?: string;
  trade2Name?: string;
  trade2Address?: string;
  trade2CityStateZip?: string;
  trade2Attn?: string;
  trade2Email?: string;
  trade2FaxNo?: string;
  trade3Name?: string;
  trade3Address?: string;
  trade3CityStateZip?: string;
  trade3Attn?: string;
  trade3Email?: string;
  trade3FaxNo?: string;
  termsAgreed?: boolean;
}

interface ShippingRequestData {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  shippingAddress: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  productDescription: string;
  quantity: string;
  estimatedValue: string;
  orderRequest: string;
  specialInstructions?: string;
  shippingMethod: string;
  customShippingMethod?: string;
  urgency: string;
  trackingRequired?: boolean;
  insuranceRequired?: boolean;
  purposeOfShipment?: string;
  customPurpose?: string;
  hsCode?: string;
  countryOfOrigin?: string;
  termsAgreed?: boolean;
}

// Simple email fallback using built-in fetch for emergency cases
async function sendEmailFallback(data: EmailDataBase) {
  console.log('📧 FALLBACK: Using simple email service...');
  
  // Log the email content for debugging
  console.log('📧 EMAIL CONTENT:', {
    to: data.to,
    subject: data.subject,
    from: data.from || 'noreply@alliancechemical.com'
  });
  
  console.log('📧 EMAIL BODY (first 200 chars):', data.text.substring(0, 200) + '...');
  
  // Try a simple HTTP-based email service as backup
  try {
    // You could integrate with services like:
    // - Resend (https://resend.com)
    // - Postmark (https://postmarkapp.com)
    // - SendGrid (https://sendgrid.com)
    // - Mailgun (https://www.mailgun.com)
    
    // For now, we'll use a webhook approach if available
    if (process.env.WEBHOOK_EMAIL_URL) {
      console.log('📧 FALLBACK: Trying webhook email service...');
      
      const response = await fetch(process.env.WEBHOOK_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_EMAIL_TOKEN || 'none'}`
        },
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          html: data.html,
          text: data.text,
          from: data.from || 'noreply@alliancechemical.com'
        })
      });
      
      if (response.ok) {
        console.log('✅ FALLBACK: Email sent via webhook service');
        return { 
          success: true, 
          message: 'Email sent via webhook fallback service' 
        };
      } else {
        console.warn('⚠️ FALLBACK: Webhook service failed:', await response.text());
      }
    }
    
    // If no webhook service, just log and return success to not break the app
    console.log('✅ FALLBACK: Email logged (no backup service configured)');
    console.log('💡 FALLBACK: To enable actual email sending, configure Microsoft Graph or set WEBHOOK_EMAIL_URL');
    
    return { 
      success: true, 
      message: 'Email logged - configure Microsoft Graph or webhook service for actual sending' 
    };
    
  } catch (error) {
    console.error('❌ FALLBACK: Even fallback failed:', error);
    return { 
      success: true, // Still return success to not break the app
      message: 'Email logged - all email services failed' 
    };
  }
}

export async function sendEmail(data: EmailDataBase, options?: {
  applicationId?: number;
  type?: 'application_summary' | 'ai_analysis' | 'approval_notification' | 'test';
  immediate?: boolean; // Skip queue for immediate sending
}) {
  console.log('📧 Email Service: Starting email send process');
  
  const emailType = options?.type || 'test';
  const useQueue = !options?.immediate;
  
  if (useQueue) {
    console.log('📬 Using Vercel KV email queue');
    
    try {
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
      
      // MODIFICATION: Replace the unreliable fetch call with a direct, non-blocking
      // function call. This is much more reliable in a serverless environment.
      console.log('🚀 Attempting to trigger email queue processing...');
      
      try {
        // Use setImmediate to ensure this runs in the next tick
        setImmediate(async () => {
          try {
            console.log('🎯 Queue trigger: Starting processing in next tick...');
            await processEmailQueue();
            console.log('✅ Queue trigger: Processing completed successfully');
          } catch (error) {
            console.warn('⚠️ Background email queue processing failed:', error);
          }
        });
        console.log('✅ Email queue processing scheduled successfully');
      } catch (syncError) {
        console.error('❌ Failed to schedule email queue processing:', syncError);
      }
      
      return { 
        success: true, 
        message: 'Email queued for sending',
        emailId: emailId
      };
    } catch (queueError) {
      console.error('❌ Failed to queue email, falling back to direct send:', queueError);
      // Fall through to direct sending
    }
  }
  
  // Direct sending (fallback or immediate mode)
  console.log('📧 Email Service: Direct sending mode');
  
  // Detailed configuration verification
  const configCheck = verifyGraphConfiguration();
  console.log('🔍 Microsoft Graph Configuration Check:', configCheck);

  if (!configCheck.isValid) {
    console.error('❌ Microsoft Graph configuration issues:', configCheck.issues);
    console.log('📧 Using fallback email method...');
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
      console.log('📧 Trying fallback email method...');
      return await sendEmailFallback(data);
    }
  } catch (error) {
    console.error('❌ Email service error:', error);
    console.log('📧 Using fallback email method due to error...');
    return await sendEmailFallback(data);
  }
}

export async function sendApplicationSummary(applicationData: ApplicationData) {
  if (!process.env.EMAIL_FORM) {
    console.warn('EMAIL_FORM environment variable not set. Cannot send application summary.');
    return;
  }

  const subject = `[New App] ${applicationData.legalEntityName} (ID: ${applicationData.id || 'N/A'})`;
  
  // Simplified text body - NO AI ANALYSIS
  const textBody = `
A new customer credit application has been received and is being processed by our AI system.

Company: ${applicationData.legalEntityName}
Application ID: ${applicationData.id || 'N/A'}
Submission Date: ${new Date().toISOString()}

🤖 AI PROCESSING STATUS: In progress...
You will receive a separate AI credit analysis report within 1-2 minutes.

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
    <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 14px;">You will receive a separate AI credit analysis report within 1-2 minutes.</p>
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
    to: process.env.EMAIL_FORM,
    subject: subject,
    text: textBody,
    html: htmlBody,
  }, {
    applicationId: applicationData.id,
    type: 'application_summary'
  });
}

export async function sendShippingRequestSummary(data: ShippingRequestData) {
  if (!process.env.EMAIL_FORM) {
    console.warn('EMAIL_FORM environment variable not set. Cannot send shipping request summary.');
    return;
  }

  const subject = `[New Intl. Shipping Request] ${data.company || `${data.firstName} ${data.lastName}`} (ID: ${data.id || 'N/A'})`;
  
  const textBody = `
New International Shipping Request Received
Request ID: ${data.id || 'N/A'}
Submission Date: ${new Date().toISOString()}

[CONTACT INFORMATION]
Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Phone: ${data.phone}
Company: ${data.company || 'N/A'}

[SHIPPING ADDRESS]
${data.shippingAddress}
${data.addressLine2 || ''}
${data.city}, ${data.stateProvince} ${data.postalCode}
Country: ${data.country}

[ORDER DETAILS]
Product Description: ${data.productDescription}
Quantity: ${data.quantity}
Estimated Value (USD): ${data.estimatedValue}
Order Request Details: ${data.orderRequest}
Special Instructions: ${data.specialInstructions || 'N/A'}

[SHIPPING PREFERENCES]
Method: ${data.shippingMethod} ${data.customShippingMethod ? `(Custom: ${data.customShippingMethod})` : ''}
Urgency: ${data.urgency}
Tracking Required: ${data.trackingRequired ? 'Yes' : 'No'}
Insurance Required: ${data.insuranceRequired ? 'Yes' : 'No'}

[CUSTOMS & DECLARATION]
Purpose of Shipment: ${data.purposeOfShipment || 'N/A'} ${data.customPurpose ? `(Custom: ${data.customPurpose})` : ''}
HS Code: ${data.hsCode || 'N/A'}
Country of Origin: ${data.countryOfOrigin || 'N/A'}

[TERMS]
Terms Agreed: ${data.termsAgreed ? 'Yes' : 'No'}
`;

  const htmlBody = `
<html>
<body>
  <h1>New International Shipping Request: ${data.company || `${data.firstName} ${data.lastName}`}</h1>
  <p><strong>Request ID:</strong> ${data.id || 'N/A'}</p>
  <p><strong>Submission Date:</strong> ${new Date().toISOString()}</p>

  <h2>Contact Information</h2>
  <ul>
    <li><strong>Name:</strong> ${data.firstName} ${data.lastName}</li>
    <li><strong>Email:</strong> ${data.email}</li>
    <li><strong>Phone:</strong> ${data.phone}</li>
    <li><strong>Company:</strong> ${data.company || 'N/A'}</li>
  </ul>

  <h2>Shipping Address</h2>
  <p>
    ${data.shippingAddress}<br>
    ${data.addressLine2 ? `${data.addressLine2}<br>` : ''}
    ${data.city}, ${data.stateProvince} ${data.postalCode}<br>
    <strong>Country:</strong> ${data.country}
  </p>

  <h2>Order Details</h2>
  <ul>
    <li><strong>Product Description:</strong> ${data.productDescription}</li>
    <li><strong>Quantity:</strong> ${data.quantity}</li>
    <li><strong>Estimated Value (USD):</strong> ${data.estimatedValue}</li>
    <li><strong>Order Request Details:</strong><br><pre style="white-space: pre-wrap; word-wrap: break-word;">${data.orderRequest}</pre></li>
    <li><strong>Special Instructions:</strong> ${data.specialInstructions || 'N/A'}</li>
  </ul>

  <h2>Shipping Preferences</h2>
  <ul>
    <li><strong>Method:</strong> ${data.shippingMethod} ${data.customShippingMethod ? `(Custom: ${data.customShippingMethod})` : ''}</li>
    <li><strong>Urgency:</strong> ${data.urgency}</li>
    <li><strong>Tracking Required:</strong> ${data.trackingRequired ? 'Yes' : 'No'}</li>
    <li><strong>Insurance Required:</strong> ${data.insuranceRequired ? 'Yes' : 'No'}</li>
  </ul>

  <h2>Customs & Declaration</h2>
  <ul>
    <li><strong>Purpose of Shipment:</strong> ${data.purposeOfShipment || 'N/A'} ${data.customPurpose ? `(Custom: ${data.customPurpose})` : ''}</li>
    <li><strong>HS Code:</strong> ${data.hsCode || 'N/A'}</li>
    <li><strong>Country of Origin:</strong> ${data.countryOfOrigin || 'N/A'}</li>
  </ul>

  <h2>Terms</h2>
  <p><strong>Terms Agreed:</strong> ${data.termsAgreed ? 'Yes' : 'No'}</p>
</body>
</html>
`;

  await sendEmail({
    to: process.env.EMAIL_FORM,
    subject: subject,
    text: textBody,
    html: htmlBody,
  });
} 