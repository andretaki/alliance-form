import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  console.log('🧪 Testing email functionality...');
  
  const testEmailData = {
    to: 'andre@alliancechemical.com', // Send test email to yourself
    subject: '🧪 TEST: Microsoft Graph Email Test',
    text: `TEST EMAIL

This is a test email to verify Microsoft Graph configuration is working.

Sent at: ${new Date().toISOString()}
From: Alliance Chemical Credit Application System

If you receive this email, Microsoft Graph is working correctly!`,
    html: `
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #10b981;">🧪 Microsoft Graph Test Success!</h2>
  <p>This is a test email to verify Microsoft Graph configuration is working.</p>
  
  <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Test Details:</strong></p>
    <ul>
      <li>Sent at: ${new Date().toISOString()}</li>
      <li>From: Alliance Chemical Credit Application System</li>
      <li>Service: Microsoft Graph API</li>
    </ul>
  </div>
  
  <p style="color: #059669;">✅ If you receive this email, Microsoft Graph is working correctly!</p>
  
  <hr style="margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    This is an automated test email from the Alliance Chemical credit application system.
  </p>
</body>
</html>`
  };

  try {
    console.log('📧 Sending test email via Microsoft Graph...');
    const result = await sendEmail(testEmailData, { immediate: true, type: 'test' });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        details: 'Check andre@alliancechemical.com for the test email',
        result: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Test email failed',
        error: result.message,
        details: result
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test email error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 