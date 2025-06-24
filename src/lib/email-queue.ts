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
    // Add to KV queue
    await kv.lpush(EMAIL_QUEUE_KEY, JSON.stringify(queuedEmail));
    console.log(`✅ Email queued successfully: ${emailId}`);
    return emailId;
  } catch (error) {
    console.error('❌ Failed to queue email:', error);
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
  
  let processed = 0;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Process up to 10 emails at a time
    for (let i = 0; i < 10; i++) {
      const emailJson = await kv.rpop(EMAIL_QUEUE_KEY);
      if (!emailJson) break; // Queue is empty
      
      processed++;
      
      try {
        const email: QueuedEmail = JSON.parse(emailJson as string);
        console.log(`📧 Processing email: ${email.id} (attempt ${email.attempts + 1})`);
        
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
          console.log(`✅ Email sent successfully: ${email.id}`);
          sent++;
          
          // Mark as sent in KV for tracking
          await kv.set(`email_sent_${email.id}`, {
            ...email,
            status: 'sent',
            sentAt: new Date().toISOString()
          }, { ex: 86400 }); // Keep for 24 hours
          
        } else {
          throw new Error(result.message || 'Email sending failed');
        }
        
      } catch (emailError) {
        console.error(`❌ Failed to send email:`, emailError);
        
        try {
          const email: QueuedEmail = JSON.parse(emailJson as string);
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
          errors.push(`Failed to handle retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
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