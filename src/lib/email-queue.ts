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

const EMAIL_QUEUE_KEY = 'email_queue_fluid_v1'; // New key to avoid conflicts
const MAX_ATTEMPTS = 3;
const KV_TIMEOUT_MS = 5000; // Increased timeout

// Initialize queue on first use
async function ensureQueueExists() {
  try {
    const type = await kv.type(EMAIL_QUEUE_KEY);
    if (type !== 'zset' && type !== 'none') {
      console.warn(`⚠️ Queue key exists with wrong type: ${type}, deleting...`);
      await kv.del(EMAIL_QUEUE_KEY);
    }
  } catch (error) {
    console.error('❌ Queue initialization error:', error);
  }
}

// Add connection check function
export async function checkKVConnection(): Promise<boolean> {
  try {
    const pingPromise = kv.ping();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('KV ping timeout')), 1000)
    );
    
    await Promise.race([pingPromise, timeoutPromise]);
    console.log('✅ KV connection healthy');
    return true;
  } catch (error) {
    console.error('❌ KV connection check failed:', error);
    return false;
  }
}

// Check if KV is available and working
let kvAvailable: boolean | null = null;
let lastKVCheck = 0;
const KV_CHECK_INTERVAL = 60000; // Check every minute

async function isKVAvailable(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached result if recent
  if (kvAvailable !== null && (now - lastKVCheck) < KV_CHECK_INTERVAL) {
    return kvAvailable;
  }
  
  // Perform health check
  try {
    console.log('🔍 Checking KV availability...');
    kvAvailable = await checkKVConnection();
    lastKVCheck = now;
    return kvAvailable;
  } catch (error) {
    console.error('❌ KV availability check failed:', error);
    kvAvailable = false;
    lastKVCheck = now;
    return false;
  }
}

export async function queueEmail(emailData: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  applicationId?: number;
  type: 'application_summary' | 'ai_analysis' | 'approval_notification' | 'test';
}): Promise<string> {
  await ensureQueueExists();
  
  const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  const queuedEmail: QueuedEmail = {
    id: emailId,
    ...emailData,
    attempts: 0,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  console.log(`📬 Queueing email: ${emailId} (${emailData.type})`);
  
  // Check if KV is available first
  const kvReady = await isKVAvailable();
  if (!kvReady) {
    console.warn('⚠️ KV not available, skipping queue');
    throw new Error('KV service unavailable');
  }
  
  try {
    console.log('🔍 Queue: Attempting KV operation...');
    
    const timestamp = Date.now();
    await kv.zadd(EMAIL_QUEUE_KEY, {
      score: timestamp,
      member: JSON.stringify(queuedEmail)
    });
    
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

  // Check KV availability first
  const kvReady = await isKVAvailable();
  if (!kvReady) {
    console.warn('⚠️ KV not available for queue processing');
    errors.push('KV service unavailable');
    return { processed, sent, failed, errors };
  }

  try {
    // Use zrange to get emails from sorted set
    const timestamp = Date.now();
    const zrangePromise = kv.zrange(EMAIL_QUEUE_KEY, 0, 9, {
      byScore: true,
      rev: false,
      withScores: false
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('KV zrange timeout')), 5000);
    });
    
    const emails = await Promise.race([zrangePromise, timeoutPromise]) as string[];
    
    if (!emails || emails.length === 0) {
      console.log('✅ Queue is empty');
      return { processed, sent, failed, errors };
    }
    
    console.log(`📧 Found ${emails.length} emails to process`);
    
    for (const emailJson of emails) {
      if (typeof emailJson !== 'string') continue;
      
      processed++;
      
      try {
        const email: QueuedEmail = JSON.parse(emailJson);
        console.log(`📧 Processing email: ${email.id} (attempt ${email.attempts + 1})`);
        
        // Remove from queue first to prevent reprocessing
        await kv.zrem(EMAIL_QUEUE_KEY, emailJson);
        
        // Send email
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
          
          // Store success record
          try {
            await kv.set(`email_sent_${email.id}`, {
              ...email,
              status: 'sent',
              sentAt: new Date().toISOString()
            }, { ex: 86400 });
          } catch (storeError) {
            console.warn('⚠️ Failed to store success record:', storeError);
          }
          
          // Remove backup
          try {
            await kv.del(`email_backup_${email.id}`);
          } catch (delError) {
            console.warn('⚠️ Failed to remove backup:', delError);
          }
        } else {
          throw new Error(result.message || 'Email sending failed');
        }
        
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError);
        errors.push(emailError instanceof Error ? emailError.message : 'Unknown error');
        
        // Re-parse email data in case it was corrupted
        try {
          const email: QueuedEmail = JSON.parse(emailJson);
          email.attempts++;
          email.lastAttempt = new Date().toISOString();
          
          if (email.attempts < MAX_ATTEMPTS) {
            // Re-queue with higher score (delayed retry)
            const retryScore = timestamp + (email.attempts * 60000); // Delay by minutes
            await kv.zadd(EMAIL_QUEUE_KEY, {
              score: retryScore,
              member: JSON.stringify(email)
            });
            console.log(`🔄 Email requeued for retry: ${email.id}`);
          } else {
            // Max attempts reached
            await kv.set(`email_failed_${email.id}`, email, { ex: 86400 });
            console.log(`💀 Email failed permanently: ${email.id}`);
            failed++;
          }
        } catch (requeueError) {
          console.error('❌ Failed to requeue email:', requeueError);
          failed++;
        }
      }
    }
    
    console.log(`📊 Queue processing complete: ${processed} processed, ${sent} sent, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Fatal error in queue processor:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }
  
  return { processed, sent, failed, errors };
}

export async function getQueueStats(): Promise<{
  queueLength: number;
  recentSent: number;
  recentFailed: number;
  kvHealthy: boolean;
}> {
  try {
    const kvHealthy = await isKVAvailable();
    
    if (!kvHealthy) {
      return { queueLength: 0, recentSent: 0, recentFailed: 0, kvHealthy: false };
    }
    
    // Use zcard for sorted set
    const queueLength = await kv.zcard(EMAIL_QUEUE_KEY) || 0;
    
    // Count recent sent/failed (last hour)
    const sentKeys = await kv.keys('email_sent_*');
    const failedKeys = await kv.keys('email_failed_*');
    
    return {
      queueLength,
      recentSent: sentKeys?.length || 0,
      recentFailed: failedKeys?.length || 0,
      kvHealthy
    };
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    return { queueLength: 0, recentSent: 0, recentFailed: 0, kvHealthy: false };
  }
}

// Cleanup old entries periodically
export async function cleanupQueue(): Promise<void> {
  try {
    const kvReady = await isKVAvailable();
    if (!kvReady) return;
    
    // Remove old entries from sorted set (older than 24 hours)
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    await kv.zremrangebyscore(EMAIL_QUEUE_KEY, 0, cutoffTime);
    
    console.log('✅ Queue cleanup completed');
  } catch (error) {
    console.error('❌ Queue cleanup failed:', error);
  }
}