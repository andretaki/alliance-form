import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { customerApplications, tradeReferences } from '@/lib/schema';
import { sendApplicationSummary } from '@/lib/email';
import { customerApplicationSchema, type CustomerApplicationData } from '@/lib/validation';

// This endpoint is no longer needed since we removed the admin dashboard
// Applications are now handled directly via email notifications with full details

export async function POST(request: NextRequest) {
  console.log('🚀 Applications API called');
  
  try {
    // Log database connection status
    console.log('🔍 Checking database connection...');
    if (!db) {
      console.error('❌ Database connection is not available in /api/applications');
      return NextResponse.json(
        { error: 'Database connection not available. Service temporarily unavailable.' },
        { status: 503 } // Service Unavailable
      );
    }
    console.log('✅ Database connection available');

    // Log environment info
    console.log('🌍 Environment info:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : 'undefined'
    });

    // Parse and validate request body
    console.log('📥 Parsing request body...');
    let requestData: unknown;
    try {
      requestData = await request.json();
      console.log('✅ Request body parsed successfully');
    } catch (error) {
      console.error('❌ Failed to parse JSON:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Validate data using Zod schema
    console.log('🔍 Validating request data...');
    const validationResult = customerApplicationSchema.safeParse(requestData);
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.issues);
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
    console.log('✅ Request data validated successfully');

    const data: CustomerApplicationData = validationResult.data;
    
    // Log what we're about to insert
    console.log('💾 Preparing to insert application data:', {
      legalEntityName: data.legalEntityName,
      taxEIN: data.taxEIN,
      phoneNo: data.phoneNo
    });
    
    // Insert the main application
    console.log('🔍 Attempting to insert into customer_applications table...');
    console.log('📋 Table schema info:', {
      tableName: 'customer_applications',
      schemaName: 'alliance_chemical'
    });
    
    try {
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

      console.log('✅ Application inserted successfully:', {
        id: application.id,
        legalEntityName: application.legalEntityName,
        createdAt: application.createdAt
      });

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
        console.log(`🔍 Inserting ${tradeReferencesToInsert.length} trade references...`);
        await db.insert(tradeReferences).values(tradeReferencesToInsert);
        console.log('✅ Trade references inserted successfully');
      } else {
        console.log('ℹ️ No trade references to insert');
      }

      // Send basic application summary email first
      console.log('📧 Sending application summary email...');
      sendApplicationSummary({
        id: application.id,
        ...data
      }).catch(error => {
        console.error('❌ Failed to send application summary email:', error);
        // Don't fail the API request if email fails
      });

      // 🤖 TRIGGER AI PROCESSING AGENT (Vercel-compatible async processing)
      console.log('🤖 Triggering AI processing agent...');
      
      // Import and process immediately (Vercel serverless compatible)
      try {
        const { processApplicationWithAI, sendAIAnalysisReport } = await import('@/lib/ai-processor');
        
        // Process in background without blocking response (fire-and-forget)
        processApplicationWithAI(application.id)
          .then(aiDecision => {
            console.log('✅ AI processing completed:', aiDecision.decision);
            // Send AI analysis report
            return sendAIAnalysisReport({
              id: application.id,
              ...data
            }, aiDecision);
          })
          .then(() => {
            console.log('📧 AI analysis report sent successfully');
          })
          .catch(error => {
            console.error('❌ AI processing failed:', error);
            // Don't fail the API request if AI processing fails
          });
      } catch (importError) {
        console.error('❌ Failed to load AI processor:', importError);
        // Continue without AI processing if module fails to load
      }

      console.log('🎉 Application submitted successfully!');
      return NextResponse.json({
        success: true,
        message: 'Application submitted successfully',
        application: {
          id: application.id,
          legalEntityName: application.legalEntityName,
          createdAt: application.createdAt,
        },
      }, { status: 201 });

    } catch (insertError) {
      console.error('❌ Failed to insert application:', insertError);
      
      // Log the exact error details for debugging
      if (insertError instanceof Error) {
        console.error('Insert Error Details:', {
          name: insertError.name,
          message: insertError.message,
          stack: insertError.stack
        });
      }
      
      throw insertError; // Re-throw to be caught by outer catch block
    }

  } catch (error) {
    console.error('💥 Error in /api/applications:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes('unique constraint')) {
        console.error('🔄 Unique constraint violation detected');
        return NextResponse.json(
          { error: 'Duplicate application', details: 'An application with this information already exists' },
          { status: 409 }
        );
      }
      
      // Handle foreign key constraint violations
      if (error.message.includes('foreign key constraint')) {
        console.error('🔗 Foreign key constraint violation detected');
        return NextResponse.json(
          { error: 'Invalid reference', details: 'Referenced record does not exist' },
          { status: 400 }
        );
      }

      // Handle relation not exists errors
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('🗄️ Database relation/table not found');
        console.error('This suggests either:');
        console.error('1. Tables are not in the expected schema (alliance_chemical)');
        console.error('2. Database connection is pointing to wrong database');
        console.error('3. Schema name is incorrect in table definitions');
        return NextResponse.json(
          { error: 'Database schema error', details: 'Required database tables not found. Please contact support.' },
          { status: 503 }
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