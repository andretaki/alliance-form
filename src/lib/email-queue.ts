import { kv } from '@vercel/kv';

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
  
  try {
    // MODIFICATION: Removed the blocking testKVConnection call. We will now attempt to queue directly.
    console.log('🔍 Queue: Attempting KV lpush operation...');
    
    // Add to KV queue
    await kv.lpush(EMAIL_QUEUE_KEY, JSON.stringify(queuedEmail));
    
    console.log(`✅ Email queued successfully: ${emailId}`);
    return emailId;
  } catch (error) {
    console.error('❌ Failed to queue email:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    // This will now fall back to direct sending in email.ts
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
    for (let i = 0; i < 10; i++) {
      let emailJson: string | QueuedEmail | null = null;
      try {
        const rpopPromise = kv.rpop(EMAIL_QUEUE_KEY);
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('KV rpop timed out after 5 seconds')), 5000)
        );
        emailJson = await Promise.race([rpopPromise, timeoutPromise]);
      } catch (kvError) {
        console.error('❌ Queue processor: kv.rpop failed or timed out.', kvError);
        errors.push(kvError instanceof Error ? kvError.message : 'KV rpop error');
        break; // Stop processing if KV is unresponsive
      }
      
      if (!emailJson) {
        console.log('✅ Queue processor: Queue is empty.');
        break;
      }
      
      processed++;
      
      let email: QueuedEmail;
      try {
        email = typeof emailJson === 'string' ? JSON.parse(emailJson) : emailJson;
        console.log(`📧 Processing email: ${email.id} (attempt ${email.attempts + 1}) to ${email.to}`);
        
        const { sendEmailViaGraph } = await import('@/lib/microsoft-graph');
        const result = await sendEmailViaGraph({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          from: email.from
        });

        if (result.success) {
          console.log(`✅ Email sent successfully: ${email.id}`);
          sent++;
          await kv.set(`email_sent_${email.id}`, { ...email, status: 'sent', sentAt: new Date().toISOString() }, { ex: 86400 });
        } else {
          throw new Error(result.message || 'Email sending failed via Graph');
        }
        
      } catch (emailError) {
        console.error('❌ Failed to send email, will retry if possible:', emailError);
        const emailToRetry: QueuedEmail = typeof emailJson === 'string' ? JSON.parse(emailJson) : emailJson;
        emailToRetry.attempts++;
        emailToRetry.lastAttempt = new Date().toISOString();
        
        if (emailToRetry.attempts < MAX_ATTEMPTS) {
          await kv.lpush(EMAIL_QUEUE_KEY, JSON.stringify(emailToRetry));
          console.log(`🔄 Email requeued for retry: ${emailToRetry.id}`);
        } else {
          await kv.set(`email_failed_${emailToRetry.id}`, emailToRetry, { ex: 86400 });
          console.log(`💀 Email failed permanently: ${emailToRetry.id}`);
          failed++;
        }
      }
    }
    
    console.log(`📊 Email queue processing complete: ${processed} processed, ${sent} sent, ${failed} failed`);
    
    return { processed, sent, failed, errors };
    
  } catch (error) {
    console.error('❌ Fatal error in email queue processor:', error);
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
    return { queueLength, recentSent: 0, recentFailed: 0 };
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    return { queueLength: 0, recentSent: 0, recentFailed: 0 };
  }
} 