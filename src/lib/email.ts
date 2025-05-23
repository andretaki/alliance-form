import { GoogleGenerativeAI } from '@google/generative-ai';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAIL_API_KEY!,
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function sendApplicationSummary(applicationData: any) {
  try {
    // Generate comprehensive analysis using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });
    
    const prompt = `Please provide a detailed analysis of this customer application, including:
    1. Company Overview
    2. Key Contact Information
    3. Business Operations Analysis
    4. Risk Assessment
    5. Recommendations for Follow-up

    Application Details:
    Company Name: ${applicationData.legalEntityName}
    DBA: ${applicationData.dba || 'N/A'}
    Tax EIN: ${applicationData.taxEIN}
    DUNS Number: ${applicationData.dunsNumber || 'N/A'}
    Phone: ${applicationData.phoneNo}
    Billing Address: ${applicationData.billToAddress}
    Billing City/State/Zip: ${applicationData.billToCityStateZip}
    Shipping Address: ${applicationData.shipToAddress}
    Shipping City/State/Zip: ${applicationData.shipToCityStateZip}
    Buyer Contact: ${applicationData.buyerNameEmail}
    AP Contact: ${applicationData.accountsPayableNameEmail}
    Invoice Email: ${applicationData.wantInvoicesEmailed ? applicationData.invoiceEmail : 'Not requested'}
    
    Trade References:
    ${applicationData.trade1Name ? `Reference 1: ${applicationData.trade1Name}
    Address: ${applicationData.trade1Address}
    Contact: ${applicationData.trade1Attn}
    Email: ${applicationData.trade1Email}
    Phone/Fax: ${applicationData.trade1FaxNo}` : 'No reference provided'}
    
    ${applicationData.trade2Name ? `Reference 2: ${applicationData.trade2Name}
    Address: ${applicationData.trade2Address}
    Contact: ${applicationData.trade2Attn}
    Email: ${applicationData.trade2Email}
    Phone/Fax: ${applicationData.trade2FaxNo}` : 'No reference provided'}
    
    ${applicationData.trade3Name ? `Reference 3: ${applicationData.trade3Name}
    Address: ${applicationData.trade3Address}
    Contact: ${applicationData.trade3Attn}
    Email: ${applicationData.trade3Email}
    Phone/Fax: ${applicationData.trade3FaxNo}` : 'No reference provided'}`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    // Send comprehensive analysis to admin
    const adminMessageData = {
      from: `FormWizard <FormWizard@${process.env.MAILGUN_DOMAIN}>`,
      to: process.env.ADMIN_EMAIL!,
      subject: `[Detailed Analysis] New Customer Application: ${applicationData.legalEntityName}`,
      text: analysis,
      html: `
        <h2>Detailed Customer Application Analysis</h2>
        <div style="white-space: pre-wrap;">${analysis}</div>
      `,
    };

    // Send structured data to ticketing system
    const ticketMessageData = {
      from: `FormWizard <FormWizard@${process.env.MAILGUN_DOMAIN}>`,
      to: process.env.EMAIL_FORM!,
      subject: `[New Customer Application] ${applicationData.legalEntityName} | EIN: ${applicationData.taxEIN}`,
      text: `[CUSTOMER APPLICATION DATA]
Timestamp: ${new Date().toISOString()}
Application ID: ${applicationData.id || 'Pending'}

[COMPANY INFORMATION]
Legal Entity Name: ${applicationData.legalEntityName}
DBA: ${applicationData.dba || 'N/A'}
Tax EIN: ${applicationData.taxEIN}
DUNS Number: ${applicationData.dunsNumber || 'N/A'}

[CONTACT INFORMATION]
Phone: ${applicationData.phoneNo}
Buyer Contact: ${applicationData.buyerNameEmail}
AP Contact: ${applicationData.accountsPayableNameEmail}
Invoice Email: ${applicationData.wantInvoicesEmailed ? applicationData.invoiceEmail : 'Not requested'}

[ADDRESSES]
Billing Address:
${applicationData.billToAddress}
${applicationData.billToCityStateZip}

Shipping Address:
${applicationData.shipToAddress}
${applicationData.shipToCityStateZip}

[TRADE REFERENCES]
${applicationData.trade1Name ? `Reference 1:
Company: ${applicationData.trade1Name}
Address: ${applicationData.trade1Address}
City/State/Zip: ${applicationData.trade1CityStateZip}
Contact: ${applicationData.trade1Attn}
Email: ${applicationData.trade1Email}
Phone/Fax: ${applicationData.trade1FaxNo}
` : 'No reference provided'}

${applicationData.trade2Name ? `Reference 2:
Company: ${applicationData.trade2Name}
Address: ${applicationData.trade2Address}
City/State/Zip: ${applicationData.trade2CityStateZip}
Contact: ${applicationData.trade2Attn}
Email: ${applicationData.trade2Email}
Phone/Fax: ${applicationData.trade2FaxNo}
` : 'No reference provided'}

${applicationData.trade3Name ? `Reference 3:
Company: ${applicationData.trade3Name}
Address: ${applicationData.trade3Address}
City/State/Zip: ${applicationData.trade3CityStateZip}
Contact: ${applicationData.trade3Attn}
Email: ${applicationData.trade3Email}
Phone/Fax: ${applicationData.trade3FaxNo}
` : 'No reference provided'}

[APPLICATION METADATA]
Terms Agreed: ${applicationData.termsAgreed ? 'Yes' : 'No'}
Submission Date: ${new Date().toISOString()}
`,
      html: `
        <h1>Customer Application Data</h1>
        <div style="font-family: monospace; white-space: pre-wrap;">
          <h2>Company Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Legal Entity Name:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.legalEntityName}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>DBA:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.dba || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tax EIN:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.taxEIN}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>DUNS Number:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.dunsNumber || 'N/A'}</td></tr>
          </table>

          <h2>Contact Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.phoneNo}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Buyer Contact:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.buyerNameEmail}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>AP Contact:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.accountsPayableNameEmail}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Invoice Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.wantInvoicesEmailed ? applicationData.invoiceEmail : 'Not requested'}</td></tr>
          </table>

          <h2>Addresses</h2>
          <h3>Billing Address</h3>
          <p>${applicationData.billToAddress}<br>${applicationData.billToCityStateZip}</p>
          
          <h3>Shipping Address</h3>
          <p>${applicationData.shipToAddress}<br>${applicationData.shipToCityStateZip}</p>

          <h2>Trade References</h2>
          ${applicationData.trade1Name ? `
          <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd;">
            <h3>Reference 1</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade1Name}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Address:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade1Address}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>City/State/Zip:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade1CityStateZip}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade1Attn}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade1Email}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone/Fax:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade1FaxNo}</td></tr>
            </table>
          </div>
          ` : '<p>No reference provided</p>'}

          ${applicationData.trade2Name ? `
          <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd;">
            <h3>Reference 2</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade2Name}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Address:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade2Address}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>City/State/Zip:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade2CityStateZip}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade2Attn}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade2Email}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone/Fax:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade2FaxNo}</td></tr>
            </table>
          </div>
          ` : ''}

          ${applicationData.trade3Name ? `
          <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd;">
            <h3>Reference 3</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade3Name}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Address:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade3Address}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>City/State/Zip:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade3CityStateZip}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade3Attn}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade3Email}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone/Fax:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.trade3FaxNo}</td></tr>
            </table>
          </div>
          ` : ''}

          <h2>Application Metadata</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Terms Agreed:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${applicationData.termsAgreed ? 'Yes' : 'No'}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Submission Date:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
      `,
    };

    // Send both emails
    await Promise.all([
      mg.messages.create(process.env.MAILGUN_DOMAIN!, adminMessageData),
      mg.messages.create(process.env.MAILGUN_DOMAIN!, ticketMessageData)
    ]);

    return true;
  } catch (error) {
    console.error('Error sending application summary:', error);
    throw error;
  }
} 