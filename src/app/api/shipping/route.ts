import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { internationalShippingRequests } from '@/lib/schema';
import { sendShippingRequestSummary } from '@/lib/email';
import { shippingRequestSchema, type ShippingRequestData } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      console.error('Database connection is not available in /api/shipping');
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
    const validationResult = shippingRequestSchema.safeParse(requestData);
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

    const data: ShippingRequestData = validationResult.data;
    
    // Insert the shipping request
    const [shippingRequest] = await db.insert(internationalShippingRequests).values({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      shippingAddress: data.shippingAddress,
      addressLine2: data.addressLine2,
      city: data.city,
      stateProvince: data.stateProvince,
      postalCode: data.postalCode,
      country: data.country,
      productDescription: data.productDescription,
      quantity: data.quantity,
      estimatedValue: data.estimatedValue,
      orderRequest: data.orderRequest,
      specialInstructions: data.specialInstructions,
      shippingMethod: data.shippingMethod,
      customShippingMethod: data.customShippingMethod,
      urgency: data.urgency,
      trackingRequired: data.trackingRequired,
      insuranceRequired: data.insuranceRequired,
      purposeOfShipment: data.purposeOfShipment,
      customPurpose: data.customPurpose,
      hsCode: data.hsCode,
      countryOfOrigin: data.countryOfOrigin,
      status: 'pending', // Default status
    }).returning();

    if (!shippingRequest) {
      throw new Error('Failed to create shipping request record');
    }

    // Send email summary (async, don't wait for completion)
    sendShippingRequestSummary({
      id: shippingRequest.id,
      ...data
    }).catch(error => {
      console.error('Failed to send shipping request summary email:', error);
      // Don't fail the API request if email fails
    });

    return NextResponse.json({
      success: true,
      message: 'Shipping request submitted successfully',
      shippingRequest: {
        id: shippingRequest.id,
        firstName: shippingRequest.firstName,
        lastName: shippingRequest.lastName,
        email: shippingRequest.email,
        status: shippingRequest.status,
        createdAt: shippingRequest.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error in /api/shipping:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations
      if (error.message.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'Duplicate shipping request', details: 'A shipping request with this information already exists' },
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
        error: 'Failed to submit shipping request',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 