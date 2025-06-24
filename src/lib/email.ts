import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { sendEmailViaGraph, isGraphConfigured } from '@/lib/microsoft-graph';

// Initialize Mailgun client with robust error handling
const mailgun = new Mailgun(formData);
let mg: any | null = null;

// Robust environment variable validation for Mailgun
if (process.env.NODE_ENV === 'production' && (!process.env.MAIL_API_KEY || !process.env.MAILGUN_DOMAIN)) {
  console.warn('Mailgun API key or domain not provided. Will try Microsoft Graph first.');
} else if (!process.env.MAIL_API_KEY || !process.env.MAILGUN_DOMAIN) {
  console.warn('Mailgun API key or domain not provided. Will try Microsoft Graph first.');
}

// Initialize Mailgun client only if credentials are available
if (process.env.MAIL_API_KEY && process.env.MAILGUN_DOMAIN) {
  try {
    mg = mailgun.client({
      username: 'api',
      key: process.env.MAIL_API_KEY,
    });
    console.log('Mailgun client initialized successfully');
  } catch (error) {
    const message = `Failed to initialize Mailgun client: ${error}`;
    console.error(message);
    if (process.env.NODE_ENV === 'production') {
      console.warn('Mailgun failed to initialize, will use Microsoft Graph if available');
    }
  }
}

// OpenAI processing is now handled in the separate ai-processor module

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

export async function sendEmail(data: EmailDataBase) {
  // Try Microsoft Graph first if configured
  if (isGraphConfigured()) {
    console.log('🔄 Attempting to send email via Microsoft Graph...');
    const graphResult = await sendEmailViaGraph(data);
    if (graphResult.success) {
      console.log('✅ Email sent successfully via Microsoft Graph');
      return graphResult;
    } else {
      console.warn('⚠️ Microsoft Graph failed, trying Mailgun fallback:', graphResult.message);
    }
  }

  // Fallback to Mailgun
  if (!mg || !process.env.MAILGUN_DOMAIN) {
    console.error('❌ Neither Microsoft Graph nor Mailgun is configured properly');
    return { success: false, message: 'No email service available - both Microsoft Graph and Mailgun failed' };
  }

  try {
    console.log('🔄 Attempting to send email via Mailgun fallback...');
    const messageData = {
      from: data.from || `Alliance Chemical Forms <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    };

    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
    console.log('✅ Email sent successfully via Mailgun (fallback)');
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error sending email via Mailgun:', error);
    return { success: false, message: 'Both Microsoft Graph and Mailgun failed to send email', error };
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