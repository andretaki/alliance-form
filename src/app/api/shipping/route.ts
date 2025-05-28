import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { internationalShippingRequests } from '@/lib/schema';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Insert the shipping request into the database
    const [shippingRequest] = await db
      .insert(internationalShippingRequests)
      .values({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        company: body.company,
        shippingAddress: body.shippingAddress,
        addressLine2: body.addressLine2,
        city: body.city,
        stateProvince: body.stateProvince,
        postalCode: body.postalCode,
        country: body.country,
        productDescription: body.productDescription,
        quantity: body.quantity,
        estimatedValue: body.estimatedValue,
        orderRequest: body.orderRequest,
        specialInstructions: body.specialInstructions,
        shippingMethod: body.shippingMethod,
        customShippingMethod: body.customShippingMethod,
        urgency: body.urgency,
        trackingRequired: body.trackingRequired,
        insuranceRequired: body.insuranceRequired,
        purposeOfShipment: body.purposeOfShipment,
        customPurpose: body.customPurpose,
        hsCode: body.hsCode,
        countryOfOrigin: body.countryOfOrigin,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: shippingRequest
    });
  } catch (error) {
    console.error('Error submitting shipping request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit shipping request' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get a specific shipping request
      const shippingRequest = await db.query.internationalShippingRequests.findFirst({
        where: (requests, { eq }) => eq(requests.id, parseInt(id))
      });

      if (!shippingRequest) {
        return NextResponse.json(
          { success: false, error: 'Shipping request not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: shippingRequest
      });
    }

    // Get all shipping requests
    const shippingRequests = await db.query.internationalShippingRequests.findMany({
      orderBy: (requests, { desc }) => [desc(requests.createdAt)]
    });

    return NextResponse.json({
      success: true,
      data: shippingRequests
    });
  } catch (error) {
    console.error('Error fetching shipping requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shipping requests' },
      { status: 500 }
    );
  }
} 