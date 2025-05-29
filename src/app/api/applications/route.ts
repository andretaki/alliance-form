import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { customerApplications, tradeReferences } from '@/lib/schema';
import { sendApplicationSummary } from '@/lib/email';
import { customerApplicationSchema, type CustomerApplicationData } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      console.error('Database connection is not available in /api/applications');
      return NextResponse.json(
        { error: 'Database connection not available. Service temporarily unavailable.' },
        { status: 503 } // Service Unavailable
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
    const validationResult = customerApplicationSchema.safeParse(requestData);
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

    const data: CustomerApplicationData = validationResult.data;
    
    // Insert the main application
    const [application] = await db.insert(customerApplications).values({
      legalEntityName: data.legalEntityName,
      dba: data.dba,
      taxEIN: data.taxEIN,
      dunsNumber: data.dunsNumber,
      phoneNo: data.phoneNo,
      billToAddress: data.billToAddress,
      billToCityStateZip: data.billToCityStateZip,
      shipToAddress: data.shipToAddress,
      shipToCityStateZip: data.shipToCityStateZip,
      buyerNameEmail: data.buyerNameEmail,
      accountsPayableNameEmail: data.accountsPayableNameEmail,
      wantInvoicesEmailed: data.wantInvoicesEmailed,
      invoiceEmail: data.invoiceEmail,
      termsAgreed: data.termsAgreed,
    }).returning();

    if (!application) {
      throw new Error('Failed to create application record');
    }

    // Insert trade references if provided
    const tradeReferencesToInsert = [];
    
    if (data.trade1Name) {
      tradeReferencesToInsert.push({
        applicationId: application.id,
        name: data.trade1Name,
        faxNo: data.trade1FaxNo,
        address: data.trade1Address,
        email: data.trade1Email,
        cityStateZip: data.trade1CityStateZip,
        attn: data.trade1Attn,
      });
    }

    if (data.trade2Name) {
      tradeReferencesToInsert.push({
        applicationId: application.id,
        name: data.trade2Name,
        faxNo: data.trade2FaxNo,
        address: data.trade2Address,
        email: data.trade2Email,
        cityStateZip: data.trade2CityStateZip,
        attn: data.trade2Attn,
      });
    }

    if (data.trade3Name) {
      tradeReferencesToInsert.push({
        applicationId: application.id,
        name: data.trade3Name,
        faxNo: data.trade3FaxNo,
        address: data.trade3Address,
        email: data.trade3Email,
        cityStateZip: data.trade3CityStateZip,
        attn: data.trade3Attn,
      });
    }

    // Insert all trade references at once if any exist
    if (tradeReferencesToInsert.length > 0) {
      await db.insert(tradeReferences).values(tradeReferencesToInsert);
    }

    // Send email summary (async, don't wait for completion)
    sendApplicationSummary({
      id: application.id,
      ...data
    }).catch(error => {
      console.error('Failed to send application summary email:', error);
      // Don't fail the API request if email fails
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        legalEntityName: application.legalEntityName,
        createdAt: application.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error in /api/applications:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'Duplicate application', details: 'An application with this information already exists' },
          { status: 409 }
        );
      }
      
      // Handle foreign key constraint violations
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid reference', details: 'Referenced record does not exist' },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to submit application',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 