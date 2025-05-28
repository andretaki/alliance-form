import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { digitalSignatures } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, signatureHash, signedDocumentUrl, ipAddress, userAgent } = body;

    // Store the signature
    const [signature] = await db.insert(digitalSignatures).values({
      applicationId,
      signatureHash,
      signedDocumentUrl,
      ipAddress,
      userAgent,
      signedAt: new Date(),
    }).returning();

    return NextResponse.json({ success: true, signature });
  } catch (error) {
    console.error('Error storing signature:', error);
    return NextResponse.json(
      { error: 'Failed to store signature' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const signature = await db.query.digitalSignatures.findFirst({
      where: eq(digitalSignatures.applicationId, parseInt(applicationId)),
    });

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error retrieving signature:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve signature' },
      { status: 500 }
    );
  }
} 