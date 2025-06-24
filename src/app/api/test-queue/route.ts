import { NextResponse, type NextRequest } from 'next/server';
import { queueEmail, processEmailQueue, getQueueStats } from '@/lib/email-queue';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'test';
  
  console.log(`🧪 Testing email queue: ${action}`);
  
  try {
    if (action === 'stats') {
      // Get queue statistics
      const stats = await getQueueStats();
      return NextResponse.json({
        success: true,
        message: 'Queue stats retrieved',
        stats: stats
      });
    }
    
    if (action === 'process') {
      // Process the queue manually
      const results = await processEmailQueue();
      return NextResponse.json({
        success: true,
        message: 'Queue processed',
        results: results
      });
    }
    
    if (action === 'test') {
      // Queue a test email
      const emailId = await queueEmail({
        to: 'andre@alliancechemical.com',
        subject: '🧪 TEST: KV Queue System Test',
        text: `KV QUEUE TEST EMAIL

This email was queued using Vercel KV and processed by the email queue system.

Test Details:
- Queued at: ${new Date().toISOString()}
- Email ID: Will be shown in response
- Queue system: Vercel KV + Microsoft Graph

If you receive this, the KV email queue is working perfectly!`,
        html: `
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #3b82f6;">🧪 KV Queue Test Success!</h2>
  <p>This email was queued using <strong>Vercel KV</strong> and processed by the email queue system.</p>
  
  <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Test Details:</strong></p>
    <ul>
      <li>Queued at: ${new Date().toISOString()}</li>
      <li>Queue system: Vercel KV + Microsoft Graph</li>
      <li>Processing: Background/Async</li>
    </ul>
  </div>
  
  <p style="color: #059669;">✅ If you receive this, the KV email queue is working perfectly!</p>
  
  <hr style="margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    This is a test email from the Alliance Chemical KV email queue system.
  </p>
</body>
</html>`,
        type: 'test'
      });
      
      console.log(`✅ Test email queued: ${emailId}`);
      
      // Trigger processing
      fetch('/api/process-emails', { method: 'POST' }).catch(error => {
        console.warn('⚠️ Failed to trigger queue processing:', error);
      });
      
      return NextResponse.json({
        success: true,
        message: 'Test email queued successfully!',
        emailId: emailId,
        details: 'Email will be processed by the background queue. Check andre@alliancechemical.com'
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Invalid action',
      availableActions: ['test', 'stats', 'process']
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Queue test error:', error);
    
    // Check if it's a KV connection error
    if (error instanceof Error && error.message.includes('KV_')) {
      return NextResponse.json({
        success: false,
        message: 'Vercel KV not configured',
        error: 'Please set up Vercel KV in your dashboard first',
        setupInstructions: [
          '1. Go to https://vercel.com/dashboard',
          '2. Open your project',
          '3. Go to Storage tab',
          '4. Create a KV database',
          '5. Connect to project and redeploy'
        ]
      }, { status: 503 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Queue test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 