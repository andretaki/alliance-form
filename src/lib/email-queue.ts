import { kv } from '@vercel/kv';

// Test KV connection
async function testKVConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing KV connection...');
    const testKey = `test_${Date.now()}`;
    await kv.set(testKey, 'test_value', { ex: 10 }); // 10 seconds expiry
    const result = await kv.get(testKey);
    await kv.del(testKey); // cleanup
    console.log('✅ KV connection test successful');
    return result === 'test_value';
  } catch (error) {
    console.error('❌ KV connection test failed:', error);
    return false;
  }
}

interface QueuedEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  attempts: number;
  createdAt: string;
  lastAttempt?: string;
  status: 'pending' | 'sent' | 'failed';
  applicationId?: number;
  type: 'application_summary' | 'ai_analysis' | 'approval_notification' | 'test';
}

const EMAIL_QUEUE_KEY = 'email_queue';
const MAX_ATTEMPTS = 3;

export async function queueEmail(emailData: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  applicationId?: number;
  type: 'application_summary' | 'ai_analysis' | 'approval_notification' | 'test';
}): Promise<string> {
  const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  const queuedEmail: QueuedEmail = {
    id: emailId,
    ...emailData,
    attempts: 0,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  console.log(`📬 Queueing email: ${emailId} (${emailData.type})`);
  console.log('🔍 Queue: Email data prepared:', {
    id: emailId,
    to: emailData.to,
    type: emailData.type,
    hasHtml: !!emailData.html,
    hasText: !!emailData.text
  });
  
  // Test KV connection first
  const kvWorking = await testKVConnection();
  if (!kvWorking) {
    console.warn('⚠️ KV not available, falling back to direct send');
    throw new Error('KV service not available - falling back to direct send');
  }
  
  try {
    console.log('🔍 Queue: Attempting KV lpush operation...');
    console.log('🔍 Queue: Using queue key:', EMAIL_QUEUE_KEY);
    
    // Add to KV queue
    const result = await kv.lpush(EMAIL_QUEUE_KEY, JSON.stringify(queuedEmail));
    console.log('✅ Queue: KV lpush completed, result:', result);
    console.log(`✅ Email queued successfully: ${emailId}`);
    return emailId;
  } catch (error) {
    console.error('❌ Failed to queue email:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.substring(0, 300) : 'No stack'
    });
    throw error;
  }
}

export async function processEmailQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  console.log('🔄 Processing email queue...');
  console.log('🔍 Queue processor: Function called successfully');
  
  let processed = 0;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    console.log('🔍 Queue processor: Checking queue for emails...');
    // Process up to 10 emails at a time
    for (let i = 0; i < 10; i++) {
      console.log(`🔍 Queue processor: Attempting to pop from queue (iteration ${i+1})`);
      
      // Add timeout to KV rpop operation
      const rpopPromise = kv.rpop(EMAIL_QUEUE_KEY);
      const rpopTimeout = new Promise<null>((_, reject) => {
        setTimeout(() => {
          console.error('⏰ Queue processor: kv.rpop timed out after 5 seconds');
          reject(new Error('KV rpop timeout after 5 seconds'));
        }, 5000);
      });
      
      let emailJson;
      try {
        emailJson = await Promise.race([rpopPromise, rpopTimeout]);
        console.log('✅ Queue processor: Successfully popped item from queue');
      } catch (error) {
        console.error('❌ Queue processor: rpop failed:', error);
        errors.push(`KV rpop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        break; // Exit the loop if rpop fails
      }
      
      if (!emailJson) {
        console.log('✅ Queue processor: Queue is empty. Halting process.');
        break; // Queue is empty
      }
      
      processed++;
      
      try {
        // Handle both string and object responses from KV
        const email: QueuedEmail = typeof emailJson === 'string' 
          ? JSON.parse(emailJson) 
          : emailJson as QueuedEmail;
        console.log(`📧 Processing email: ${email.id} (attempt ${email.attempts + 1}) to ${email.to}`);
        
        // Import email service dynamically to avoid circular dependencies
        const { sendEmailViaGraph } = await import('@/lib/microsoft-graph');
        
        const result = await sendEmailViaGraph({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          from: email.from
        });

        if (result.success) {
          console.log(`✅ Email sent successfully: ${email.id} to ${email.to}`);
          sent++;
          
          // Mark as sent in KV for tracking
          await kv.set(`email_sent_${email.id}`, {
            ...email,
            status: 'sent',
            sentAt: new Date().toISOString()
          }, { ex: 86400 }); // Keep for 24 hours
          
        } else {
          console.error(`❌ Email sending failed: ${email.id} - ${result.message}`);
          throw new Error(result.message || 'Email sending failed');
        }
        
      } catch (emailError) {
        console.error(`❌ Failed to send email:`, emailError);
        
        try {
          // Handle both string and object responses from KV
          const email: QueuedEmail = typeof emailJson === 'string' 
            ? JSON.parse(emailJson) 
            : emailJson as QueuedEmail;
          email.attempts++;
          email.lastAttempt = new Date().toISOString();
          
          if (email.attempts < MAX_ATTEMPTS) {
            // Requeue for retry
            await kv.lpush(EMAIL_QUEUE_KEY, JSON.stringify(email));
            console.log(`🔄 Email requeued for retry: ${email.id} (attempt ${email.attempts})`);
          } else {
            // Max attempts reached
            email.status = 'failed';
            await kv.set(`email_failed_${email.id}`, email, { ex: 86400 });
            console.log(`💀 Email failed permanently: ${email.id}`);
            failed++;
          }
        } catch (retryError) {
          console.error('❌ Failed to handle email retry:', retryError);
          const errorMessage = retryError instanceof Error ? retryError.message : 
            (typeof retryError === 'string' ? retryError : JSON.stringify(retryError));
          errors.push(`Failed to handle retry for email: ${errorMessage}`);
          failed++;
        }
      }
    }
    
    console.log(`📊 Email queue processing complete: ${processed} processed, ${sent} sent, ${failed} failed`);
    
    return { processed, sent, failed, errors };
    
  } catch (error) {
    console.error('❌ Email queue processing error:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown queue error');
    return { processed, sent, failed, errors };
  }
}

export async function getQueueStats(): Promise<{
  queueLength: number;
  recentSent: number;
  recentFailed: number;
}> {
  try {
    const queueLength = await kv.llen(EMAIL_QUEUE_KEY) || 0;
    
    // Get stats from last 24 hours (simplified)
    return {
      queueLength,
      recentSent: 0, // Could implement with additional KV tracking
      recentFailed: 0
    };
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    return { queueLength: 0, recentSent: 0, recentFailed: 0 };
  }
} 