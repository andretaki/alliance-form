import OpenAI from 'openai';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

// Initialize Mailgun client with robust error handling
const mailgun = new Mailgun(formData);
let mg: Mailgun.default | null = null;

// Robust environment variable validation for Mailgun
if (process.env.NODE_ENV === 'production' && (!process.env.MAIL_API_KEY || !process.env.MAILGUN_DOMAIN)) {
  const message = 'FATAL ERROR: Mailgun API key or domain not provided. Email functionality will be critically impaired in production.';
  console.error(message);
  throw new Error(message); // Fail fast in production
} else if (!process.env.MAIL_API_KEY || !process.env.MAILGUN_DOMAIN) {
  console.warn('Mailgun API key or domain not provided. Email functionality will be disabled.');
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
      throw new Error(message);
    }
  }
}

// Initialize OpenAI (optional) with robust error handling
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('OpenAI client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    console.warn('AI analysis features will be disabled due to OpenAI initialization error.');
  }
} else {
  console.warn('OPENAI_API_KEY not provided. AI analysis features will be disabled for applicable emails.');
}

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
  if (!mg || !process.env.MAILGUN_DOMAIN) {
    console.warn('Mailgun not configured. Skipping email send for:', data.subject);
      return { success: false, message: 'Email service not configured' };
    }

  try {
    const messageData = {
      from: data.from || `Alliance Chemical Forms <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    };

    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
    console.log('Email sent successfully via Mailgun:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Error sending email via Mailgun:', error);
    return { success: false, message: 'Failed to send email', error };
  }
}

export async function sendApplicationSummary(applicationData: ApplicationData) {
  if (!process.env.EMAIL_FORM) {
    console.warn('EMAIL_FORM environment variable not set. Cannot send application summary.');
    return;
  }

  let aiAnalysisContent = 'AI analysis not performed (OpenAI not configured or error).';
  
  if (openai) {
    try {
      const prompt = `
Analyze the following new customer credit application and provide a concise risk assessment (max 150 words).
Focus on key risk indicators and suggest 1-2 immediate follow-up actions if any.

Application Details:
    Company Name: ${applicationData.legalEntityName}
    DBA: ${applicationData.dba || 'N/A'}
    Tax EIN: ${applicationData.taxEIN}
    DUNS Number: ${applicationData.dunsNumber || 'N/A'}
    Buyer Contact: ${applicationData.buyerNameEmail}
    AP Contact: ${applicationData.accountsPayableNameEmail}
    Trade Reference 1: ${applicationData.trade1Name || 'N/A'}
    Trade Reference 2: ${applicationData.trade2Name || 'N/A'}
    Trade Reference 3: ${applicationData.trade3Name || 'N/A'}

    ---
    Risk Assessment and Follow-up:
      `;

      const completion = await openai.chat.completions.create({
        model: "o3",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.5,
      });

      aiAnalysisContent = completion.choices[0]?.message?.content || 'AI analysis returned no content.';
    } catch (aiError) {
      console.error('Error generating AI analysis for application:', aiError);
      aiAnalysisContent = 'Error during AI analysis generation.';
    }
  }

  const subject = `[New Customer Application] ${applicationData.legalEntityName} (ID: ${applicationData.id || 'N/A'})`;
  
  const textBody = `
New Customer Credit Application Received
Application ID: ${applicationData.id || 'N/A'}
Submission Date: ${new Date().toISOString()}

[COMPANY INFORMATION]
Legal Entity Name: ${applicationData.legalEntityName}
DBA: ${applicationData.dba || 'N/A'}
Tax EIN: ${applicationData.taxEIN}
DUNS Number: ${applicationData.dunsNumber || 'N/A'}

[CONTACT INFORMATION]
Phone: ${applicationData.phoneNo}
Buyer Contact: ${applicationData.buyerNameEmail}
AP Contact: ${applicationData.accountsPayableNameEmail}
Invoice Email Preference: ${applicationData.wantInvoicesEmailed ? 'Yes' : 'No'}
Invoice Email: ${applicationData.invoiceEmail || (applicationData.wantInvoicesEmailed ? 'Not Provided' : 'N/A')}

[ADDRESSES]
Billing Address:
${applicationData.billToAddress}
${applicationData.billToCityStateZip}

Shipping Address:
${applicationData.shipToAddress}
${applicationData.shipToCityStateZip}

[TRADE REFERENCES]
${[1, 2, 3].map(num => {
  const name = (applicationData as any)[`trade${num}Name`];
  if (!name) return `Reference ${num}: Not Provided`;
  return `Reference ${num}:
Company: ${name}
Address: ${(applicationData as any)[`trade${num}Address`]}
City/State/Zip: ${(applicationData as any)[`trade${num}CityStateZip`]}
Contact: ${(applicationData as any)[`trade${num}Attn`]}
Email: ${(applicationData as any)[`trade${num}Email`]}
Phone/Fax: ${(applicationData as any)[`trade${num}FaxNo`]}`;
}).join('\n\n')}

[TERMS]
Terms Agreed: ${applicationData.termsAgreed ? 'Yes' : 'No'}

[AI ANALYSIS]
${aiAnalysisContent}
`;

  const htmlBody = `
<html>
<body>
  <h1>New Customer Credit Application: ${applicationData.legalEntityName}</h1>
  <p><strong>Application ID:</strong> ${applicationData.id || 'N/A'}</p>
  <p><strong>Submission Date:</strong> ${new Date().toISOString()}</p>

  <h2>Company Information</h2>
  <ul>
    <li><strong>Legal Entity Name:</strong> ${applicationData.legalEntityName}</li>
    <li><strong>DBA:</strong> ${applicationData.dba || 'N/A'}</li>
    <li><strong>Tax EIN:</strong> ${applicationData.taxEIN}</li>
    <li><strong>DUNS Number:</strong> ${applicationData.dunsNumber || 'N/A'}</li>
  </ul>

  <h2>Contact Information</h2>
  <ul>
    <li><strong>Phone:</strong> ${applicationData.phoneNo}</li>
    <li><strong>Buyer Contact:</strong> ${applicationData.buyerNameEmail}</li>
    <li><strong>AP Contact:</strong> ${applicationData.accountsPayableNameEmail}</li>
    <li><strong>Invoice Email Preference:</strong> ${applicationData.wantInvoicesEmailed ? 'Yes' : 'No'}</li>
    <li><strong>Invoice Email:</strong> ${applicationData.invoiceEmail || (applicationData.wantInvoicesEmailed ? 'Not Provided' : 'N/A')}</li>
  </ul>

  <h2>Addresses</h2>
  <h3>Billing Address:</h3>
  <p>${applicationData.billToAddress}<br>${applicationData.billToCityStateZip}</p>
  <h3>Shipping Address:</h3>
  <p>${applicationData.shipToAddress}<br>${applicationData.shipToCityStateZip}</p>

  <h2>Trade References</h2>
  ${[1, 2, 3].map(num => {
    const name = (applicationData as any)[`trade${num}Name`];
    if (!name) return `<p><strong>Reference ${num}:</strong> Not Provided</p>`;
    return `<div style="margin-bottom: 1em; padding: 0.5em; border: 1px solid #eee;">
      <h4>Reference ${num}</h4>
      <p><strong>Company:</strong> ${name}<br>
      <strong>Address:</strong> ${(applicationData as any)[`trade${num}Address`]}, ${(applicationData as any)[`trade${num}CityStateZip`]}<br>
      <strong>Contact:</strong> ${(applicationData as any)[`trade${num}Attn`]}<br>
      <strong>Email:</strong> ${(applicationData as any)[`trade${num}Email`]}<br>
      <strong>Phone/Fax:</strong> ${(applicationData as any)[`trade${num}FaxNo`]}
      </p></div>`;
  }).join('')}

  <h2>Terms</h2>
  <p><strong>Terms Agreed:</strong> ${applicationData.termsAgreed ? 'Yes' : 'No'}</p>

  <h2>AI Analysis</h2>
  <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
    <p>${aiAnalysisContent.replace(/\n/g, '<br>')}</p>
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