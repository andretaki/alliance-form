import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { creditApprovals, customerApplications } from '@/lib/schema';
import { sendEmail } from '@/lib/email';
import { eq, and } from 'drizzle-orm';

// Approval/Denial endpoint - called directly from email links
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('id');
  const decision = searchParams.get('decision'); // 'APPROVE' or 'DENY'
  const amount = searchParams.get('amount'); // Optional approval amount
  
  console.log(`🔍 Credit approval request: App ${applicationId}, Decision: ${decision}, Amount: ${amount}`);

  try {
    if (!db) {
      console.error('❌ Database connection not available');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    if (!applicationId || !decision) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!['APPROVE', 'DENY'].includes(decision.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const appId = parseInt(applicationId, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
    }

    // Get application data
    const [application] = await db
      .select()
      .from(customerApplications)
      .where(eq(customerApplications.id, appId))
      .limit(1);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Check if already processed
    const [existingApproval] = await db
      .select()
      .from(creditApprovals)
      .where(eq(creditApprovals.applicationId, appId))
      .limit(1);

    if (existingApproval && existingApproval.decision !== 'PENDING') {
      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>⚠️ Already Processed</h2>
            <p>This application has already been <strong>${existingApproval.decision.toLowerCase()}</strong>.</p>
            <p>Decision made on: ${existingApproval.createdAt?.toLocaleString()}</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    const finalDecision = decision.toUpperCase() === 'APPROVE' ? 'APPROVED' : 'DENIED';
    const approvedAmount = finalDecision === 'APPROVED' ? parseInt(amount || '1000000', 10) : null; // Default $10k in cents

    // Insert or update approval record
    if (existingApproval) {
      await db
        .update(creditApprovals)
        .set({
          decision: finalDecision,
          approvedAmount: approvedAmount,
          approvedTerms: 'Net 30',
          approverEmail: 'andre@alliancechemical.com',
          customerNotified: false,
          updatedAt: new Date(),
        })
        .where(eq(creditApprovals.id, existingApproval.id));
    } else {
      await db.insert(creditApprovals).values({
        applicationId: appId,
        decision: finalDecision,
        approvedAmount: approvedAmount,
        approvedTerms: 'Net 30',
        approverEmail: 'andre@alliancechemical.com',
        customerNotified: false,
      });
    }

    console.log(`✅ Decision recorded: ${finalDecision} for application ${appId}`);

    // Send customer notification emails
    if (finalDecision === 'APPROVED') {
      await sendCustomerApprovalEmail(application, approvedAmount || 1000000);
    } else {
      await sendCustomerDenialEmail(application);
    }

    // Return success page
    const successMessage = finalDecision === 'APPROVED' 
      ? `Application APPROVED for $${((approvedAmount || 1000000) / 100).toLocaleString()} credit limit with Net 30 terms.`
      : 'Application DENIED.';

    return new Response(`
      <html>
        <head>
          <title>Credit Decision Processed</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              max-width: 500px;
              margin: 0 auto;
            }
            .icon { font-size: 64px; margin-bottom: 20px; }
            .approved { color: #10b981; }
            .denied { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${finalDecision === 'APPROVED' ? '✅' : '❌'}</div>
            <h2 class="${finalDecision === 'APPROVED' ? 'approved' : 'denied'}">
              ${finalDecision === 'APPROVED' ? 'APPROVED!' : 'DENIED'}
            </h2>
            <p><strong>${application.legalEntityName}</strong></p>
            <p>${successMessage}</p>
            <p>Customer has been notified via email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              Processed on ${new Date().toLocaleString()}<br>
              Application ID: #${appId}
            </p>
          </div>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error('❌ Error processing credit approval:', error);
    return NextResponse.json({ 
      error: 'Failed to process approval', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Send approval email to customer
async function sendCustomerApprovalEmail(application: any, approvedAmountCents: number) {
  const approvedAmount = approvedAmountCents / 100;
  
  const customerEmails = [
    application.buyerNameEmail,
    application.accountsPayableNameEmail,
    application.invoiceEmail
  ].filter(Boolean);

  const subject = `🎉 WELCOME TO THE ALLIANCE! Credit Application Approved - ${application.legalEntityName}`;
  
  const htmlBody = `
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; text-align: center; border-radius: 15px 15px 0 0; }
    .content { background: #f8fafc; padding: 40px; }
    .approval-box { background: white; border: 3px solid #10b981; border-radius: 15px; padding: 30px; margin: 30px 0; text-align: center; }
    .amount { font-size: 36px; font-weight: bold; color: #10b981; margin: 20px 0; }
    .terms { background: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .next-steps { background: white; border-radius: 10px; padding: 25px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .contact-box { background: #1f2937; color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 30px 0; }
    .footer { text-align: center; margin-top: 40px; padding: 30px; background: #1f2937; color: white; border-radius: 0 0 15px 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 WELCOME TO THE ALLIANCE!</h1>
    <p style="font-size: 20px; margin: 0;">Your credit application has been approved!</p>
  </div>

  <div class="content">
    <div class="approval-box">
      <h2 style="color: #10b981; margin-top: 0;">✅ APPROVED</h2>
      <p><strong>Company:</strong> ${application.legalEntityName}</p>
      <div class="amount">$${approvedAmount.toLocaleString()}</div>
      <p style="color: #666;">Credit Limit</p>
    </div>

    <div class="terms">
      <h3 style="color: #059669; margin-top: 0;">📋 Your Credit Terms</h3>
      <ul style="text-align: left; margin: 0; padding-left: 20px;">
        <li><strong>Credit Limit:</strong> $${approvedAmount.toLocaleString()}</li>
        <li><strong>Payment Terms:</strong> Net 30 days</li>
        <li><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</li>
        <li><strong>Account Status:</strong> Active & Ready</li>
      </ul>
    </div>

    <div class="next-steps">
      <h3 style="color: #1f2937; margin-top: 0;">🚀 Next Steps</h3>
      <p><strong>You're all set to start ordering!</strong> Here's what happens next:</p>
      <ul style="text-align: left;">
        <li>📋 Send all future Purchase Orders to: <strong>sales@alliancechemical.com</strong></li>
        <li>📧 Our sales team will process your orders within 24 hours</li>
        <li>🚚 We'll coordinate delivery and provide tracking information</li>
        <li>💳 Invoices will be sent with Net 30 payment terms</li>
      </ul>
    </div>

    <div class="contact-box">
      <h3 style="margin-top: 0;">📞 Your Alliance Chemical Team</h3>
      <p><strong>Sales Team:</strong> sales@alliancechemical.com</p>
      <p><strong>Accounts Receivable:</strong> For billing questions</p>
      <p><strong>Customer Service:</strong> For order status and support</p>
    </div>

    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 30px 0;">
      <h3 style="color: #92400e; margin-top: 0;">🎯 Ready to Order?</h3>
      <p style="margin-bottom: 0; color: #92400e;"><strong>Send your first PO to sales@alliancechemical.com</strong> and we'll get your order processed immediately!</p>
    </div>
  </div>

  <div class="footer">
    <h2 style="margin-top: 0;">🤝 WELCOME TO THE ALLIANCE!</h2>
    <p>We're excited to partner with ${application.legalEntityName} and look forward to supporting your chemical supply needs.</p>
    <p style="margin-bottom: 0;">Thank you for choosing Alliance Chemical!</p>
  </div>
</body>
</html>`;

  const textBody = `
🎉 WELCOME TO THE ALLIANCE! 

Congratulations! Your credit application has been APPROVED.

APPROVAL DETAILS:
Company: ${application.legalEntityName}
Credit Limit: $${approvedAmount.toLocaleString()}
Payment Terms: Net 30 days
Effective Date: ${new Date().toLocaleDateString()}

NEXT STEPS:
- Send all Purchase Orders to: sales@alliancechemical.com
- Our sales team will process orders within 24 hours
- Invoices will be sent with Net 30 payment terms

READY TO ORDER?
Send your first PO to sales@alliancechemical.com and we'll get it processed immediately!

WELCOME TO THE ALLIANCE!
We're excited to partner with ${application.legalEntityName}.

Alliance Chemical Team
`;

  // Send to all customer contacts
  for (const email of customerEmails) {
    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: subject,
          html: htmlBody,
          text: textBody,
        }, {
          applicationId: application.id,
          type: 'approval_notification'
        });
        console.log(`✅ Approval email sent to ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send approval email to ${email}:`, error);
      }
    }
  }

  // Mark as notified
  if (db) {
    await db
      .update(creditApprovals)
      .set({ customerNotified: true })
      .where(eq(creditApprovals.applicationId, application.id));
  }
}

// Send denial email to customer
async function sendCustomerDenialEmail(application: any) {
  const customerEmails = [
    application.buyerNameEmail,
    application.accountsPayableNameEmail
  ].filter(Boolean);

  const subject = `Credit Application Update - ${application.legalEntityName}`;
  
  const htmlBody = `
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #f3f4f6; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Credit Application Update</h1>
    <p>Thank you for your interest in Alliance Chemical</p>
  </div>

  <div class="content">
    <p>Dear ${application.legalEntityName} team,</p>
    
    <p>Thank you for submitting your credit application. After careful review, we are unable to approve credit terms at this time.</p>
    
    <p><strong>Alternative Options:</strong></p>
    <ul>
      <li>Cash in Advance (CIA) terms are available</li>
      <li>Prepayment arrangements can be made</li>
      <li>You may reapply for credit in the future</li>
    </ul>
    
    <p>We appreciate your interest in Alliance Chemical and would be happy to discuss alternative arrangements.</p>
    
    <p>Please contact our sales team at <strong>sales@alliancechemical.com</strong> for more information.</p>
  </div>

  <div class="footer">
    <p>Alliance Chemical | Customer Service</p>
  </div>
</body>
</html>`;

  const textBody = `
Credit Application Update

Dear ${application.legalEntityName} team,

Thank you for submitting your credit application. After careful review, we are unable to approve credit terms at this time.

Alternative Options:
- Cash in Advance (CIA) terms are available
- Prepayment arrangements can be made  
- You may reapply for credit in the future

Please contact our sales team at sales@alliancechemical.com for more information.

Alliance Chemical Customer Service
`;

  // Send to customer contacts
  for (const email of customerEmails) {
    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: subject,
          html: htmlBody,
          text: textBody,
        }, {
          applicationId: application.id,
          type: 'approval_notification'
        });
        console.log(`✅ Denial email sent to ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send denial email to ${email}:`, error);
      }
    }
  }

  // Mark as notified
  if (db) {
    await db
      .update(creditApprovals)
      .set({ customerNotified: true })
      .where(eq(creditApprovals.applicationId, application.id));
  }
} 