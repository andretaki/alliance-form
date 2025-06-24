import { pgTable, serial, text, timestamp, boolean, integer, index, pgSchema } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Define the alliance_chemical schema
export const allianceChemicalSchema = pgSchema('alliance_chemical');

// Customer Applications table
export const customerApplications = allianceChemicalSchema.table('customer_applications', {
  id: serial('id').primaryKey(),
  legalEntityName: text('legal_entity_name').notNull(),
  dba: text('dba'),
  taxEIN: text('tax_ein').notNull(),
  dunsNumber: text('duns_number'),
  phoneNo: text('phone_no').notNull(),
  billToAddress: text('bill_to_address').notNull(),
  billToCityStateZip: text('bill_to_city_state_zip').notNull(),
  shipToAddress: text('ship_to_address').notNull(),
  shipToCityStateZip: text('ship_to_city_state_zip').notNull(),
  buyerNameEmail: text('buyer_name_email').notNull(),
  accountsPayableNameEmail: text('accounts_payable_name_email').notNull(),
  wantInvoicesEmailed: boolean('want_invoices_emailed').default(false),
  invoiceEmail: text('invoice_email'),
  termsAgreed: boolean('terms_agreed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Trade References table
export const tradeReferences = allianceChemicalSchema.table('trade_references', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => customerApplications.id),
  name: text('name'),
  faxNo: text('fax_no'),
  address: text('address'),
  email: text('email'),
  cityStateZip: text('city_state_zip'),
  attn: text('attn'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Terms table
export const terms = allianceChemicalSchema.table('terms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  version: text('version').default('1.0').notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  effectiveDate: timestamp('effective_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Digital Signatures table
export const digitalSignatures = allianceChemicalSchema.table('digital_signatures', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => customerApplications.id),
  signatureHash: text('signature_hash').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  signedDocumentUrl: text('signed_document_url').notNull(),
  signedAt: timestamp('signed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Vendor Forms table
export const vendorForms = allianceChemicalSchema.table('vendor_forms', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => customerApplications.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedAt: timestamp('uploaded_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// International Shipping Requests table
export const internationalShippingRequests = allianceChemicalSchema.table('international_shipping_requests', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  company: text('company'),
  shippingAddress: text('shipping_address').notNull(),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  stateProvince: text('state_province').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull(),
  productDescription: text('product_description').notNull(),
  quantity: text('quantity').notNull(),
  estimatedValue: text('estimated_value').notNull(),
  orderRequest: text('order_request').notNull(),
  specialInstructions: text('special_instructions'),
  shippingMethod: text('shipping_method').notNull(),
  customShippingMethod: text('custom_shipping_method'),
  urgency: text('urgency').notNull(),
  trackingRequired: boolean('tracking_required').default(false),
  insuranceRequired: boolean('insurance_required').default(false),
  purposeOfShipment: text('purpose_of_shipment'),
  customPurpose: text('custom_purpose'),
  hsCode: text('hs_code'),
  countryOfOrigin: text('country_of_origin'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Credit Approval Decisions table
export const creditApprovals = allianceChemicalSchema.table('credit_approvals', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => customerApplications.id).notNull(),
  decision: text('decision').notNull(), // 'APPROVED', 'DENIED', 'PENDING'
  approvedAmount: integer('approved_amount'), // Amount in cents
  approvedTerms: text('approved_terms'), // e.g. 'Net 30'
  approverEmail: text('approver_email'),
  approverNotes: text('approver_notes'),
  customerNotified: boolean('customer_notified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export types for TypeScript inference
export type CustomerApplication = typeof customerApplications.$inferSelect;
export type TradeReference = typeof tradeReferences.$inferSelect;
export type Terms = typeof terms.$inferSelect;
export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type VendorForm = typeof vendorForms.$inferSelect;
export type InternationalShippingRequest = typeof internationalShippingRequests.$inferSelect;
export type CreditApproval = typeof creditApprovals.$inferSelect; 