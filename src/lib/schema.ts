import { pgTable, serial, text, timestamp, boolean, integer, index, pgSchema } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Define the schema name constant
const schemaName = 'alliance_chemical';

// Customer Applications table
export const customerApplications = pgTable('customer_applications', {
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
}, (table) => {
  return {
    // Add any specific indexes here if needed
  };
}, { schema: schemaName });

// Trade References table
export const tradeReferences = pgTable('trade_references', {
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
}, (table) => {
  return {
    applicationIdIdx: index('idx_trade_references_application_id').on(table.applicationId),
  };
}, { schema: schemaName });

// Terms and Conditions table
export const terms = pgTable('terms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  version: text('version').notNull().default('1.0'),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  effectiveDate: timestamp('effective_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, undefined, { schema: schemaName });

// Digital Signatures table
export const digitalSignatures = pgTable('digital_signatures', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => customerApplications.id),
  signatureHash: text('signature_hash').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  signedDocumentUrl: text('signed_document_url').notNull(),
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    applicationIdIdx: index('idx_digital_signatures_application_id').on(table.applicationId),
  };
}, { schema: schemaName });

// International Shipping Requests table
export const internationalShippingRequests = pgTable('international_shipping_requests', {
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
}, (table) => {
  return {
    emailIdx: index('idx_international_shipping_requests_email').on(table.email),
    statusIdx: index('idx_international_shipping_requests_status').on(table.status),
  };
}, { schema: schemaName });

// Vendor Forms table
export const vendorForms = pgTable('vendor_forms', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => customerApplications.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    applicationIdIdx: index('idx_vendor_forms_application_id').on(table.applicationId),
  };
}, { schema: schemaName });

// Add trigger for updating updated_at
export const vendorFormsUpdatedAtTrigger = sql`
  CREATE TRIGGER vendor_forms_updated_at
  BEFORE UPDATE ON vendor_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`; 