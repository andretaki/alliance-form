import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { digitalSignatures, customerApplications } from '@/lib/schema';
import { digitalSignatureSchema, type DigitalSignatureData } from '@/lib/validation';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      console.error('Database connection is not available in /api/signatures');
      return NextResponse.json(
        { error: 'Database connection not available. Service temporarily unavailable.' },
        { status: 503 }
      );
    }

    // Parse and validate request body
    let requestData: unknown;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Validate data using Zod schema
    const validationResult = digitalSignatureSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    const data: DigitalSignatureData = validationResult.data;

    // Verify that the application exists
    const [existingApplication] = await db
      .select()
      .from(customerApplications)
      .where(eq(customerApplications.id, data.applicationId))
      .limit(1);

    if (!existingApplication) {
      return NextResponse.json(
        { error: 'Invalid application ID', details: 'The specified application does not exist' },
        { status: 404 }
      );
    }

    // Check if a signature already exists for this application
    const [existingSignature] = await db
      .select()
      .from(digitalSignatures)
      .where(eq(digitalSignatures.applicationId, data.applicationId))
      .limit(1);

    if (existingSignature) {
      return NextResponse.json(
        { error: 'Signature already exists', details: 'This application has already been signed' },
        { status: 409 }
      );
    }

    // Create signature hash (simple example - in production, use a more secure method)
    const signatureHash = Buffer.from(
      `${data.applicationId}-${data.signerEmail}-${data.signedAt}-${Date.now()}`
    ).toString('base64');

    // Generate a document URL (placeholder - in production, you'd generate a PDF and store it)
    const signedDocumentUrl = `https://example.com/signed-documents/${signatureHash}.pdf`;

    // Insert the digital signature
    const [signature] = await db.insert(digitalSignatures).values({
      applicationId: data.applicationId,
      signerName: data.signerName,
      signerEmail: data.signerEmail,
      signatureDataUrl: data.signatureDataUrl,
      signatureHash: signatureHash,
      signedDocumentUrl: signedDocumentUrl,
      signedAt: new Date(data.signedAt),
    }).returning();

    if (!signature) {
      throw new Error('Failed to create signature record');
    }

    return NextResponse.json({
      success: true,
      message: 'Digital signature recorded successfully',
      signature: {
        id: signature.id,
        applicationId: signature.applicationId,
        signerName: signature.signerName,
        signerEmail: signature.signerEmail,
        signatureHash: signature.signatureHash,
        signedDocumentUrl: signature.signedDocumentUrl,
        signedAt: signature.signedAt,
        createdAt: signature.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error in /api/signatures:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'Duplicate signature', details: 'A signature for this application already exists' },
          { status: 409 }
        );
      }
      
      // Handle foreign key constraint violations
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid application reference', details: 'The specified application does not exist' },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to record digital signature',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 