import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerApplications, tradeReferences } from '@/lib/schema';
import { sendApplicationSummary } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
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

    // Insert trade references if provided
    if (data.trade1Name) {
      await db.insert(tradeReferences).values({
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
      await db.insert(tradeReferences).values({
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
      await db.insert(tradeReferences).values({
        applicationId: application.id,
        name: data.trade3Name,
        faxNo: data.trade3FaxNo,
        address: data.trade3Address,
        email: data.trade3Email,
        cityStateZip: data.trade3CityStateZip,
        attn: data.trade3Attn,
      });
    }

    // Send email summary
    try {
      await sendApplicationSummary({ ...data, id: application.id });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the entire request if email fails
    }

    return NextResponse.json({ success: true, applicationId: application.id });
  } catch (error) {
    console.error('Error saving application:', error);
    return NextResponse.json(
      { error: 'Failed to save application' },
      { status: 500 }
    );
  }
} 