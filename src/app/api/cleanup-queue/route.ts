import { NextResponse, type NextRequest } from 'next/server';
import { cleanupQueue, getQueueStats } from '@/lib/email-queue';

export async function GET(request: NextRequest) {
  console.log('🧹 Queue cleanup triggered');
  
  try {
    // Get stats before cleanup
    const statsBefore = await getQueueStats();
    
    // Perform cleanup
    await cleanupQueue();
    
    // Get stats after cleanup
    const statsAfter = await getQueueStats();
    
    return NextResponse.json({
      success: true,
      message: 'Queue cleanup completed',
      statsBefore,
      statsAfter,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Queue cleanup failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Queue cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Support POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
} 