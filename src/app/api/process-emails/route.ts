import { NextResponse, type NextRequest } from 'next/server';
import { processEmailQueue, getQueueStats } from '@/lib/email-queue';

export async function POST(request: NextRequest) {
  console.log('🔄 Email queue processor triggered');
  
  try {
    const stats = await processEmailQueue();
    
    return NextResponse.json({
      success: true,
      message: 'Email queue processed',
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Email queue processing failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Email queue processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📊 Getting email queue stats');
  
  try {
    const stats = await getQueueStats();
    
    return NextResponse.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get queue stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 