import { NextResponse } from 'next/server';
import { checkKVConnection } from '@/lib/email-queue';
import { verifyGraphConfiguration } from '@/lib/microsoft-graph';

export async function GET() {
  const kvHealthy = await checkKVConnection();
  const graphConfig = verifyGraphConfiguration();
  
  const health = {
    timestamp: new Date().toISOString(),
    fluidCompute: true,
    services: {
      kv: {
        healthy: kvHealthy,
        message: kvHealthy ? 'Connected' : 'Connection failed'
      },
      microsoftGraph: {
        configured: graphConfig.isValid,
        issues: graphConfig.issues
      }
    },
    environment: {
      hasEmailForm: !!process.env.EMAIL_FORM,
      hasKvUrl: !!process.env.KV_URL,
      runtime: 'nodejs' // Fluid Compute with Node.js
    }
  };
  
  const allHealthy = kvHealthy && graphConfig.isValid;
  
  return NextResponse.json(health, { 
    status: allHealthy ? 200 : 503 
  });
} 