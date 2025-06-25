import { pgTable, serial, text, timestamp, boolean, integer, index, pgSchema } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Define schema to match database structure
export const applicationsSchema = pgSchema('applications'); // Main schema: verceldb.applications

// === APPLICATIONS SCHEMA TABLES (main application tables) ===

// Customer Applications table (in applications schema)
export const customerApplications = applicationsSchema.table('customer_applications', {
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

// Trade References table (in applications schema)
export const tradeReferences = applicationsSchema.table('trade_references', {
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

// Digital Signatures table (in applications schema)
export const digitalSignatures = applicationsSchema.table('digital_signatures', {
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

// Vendor Forms table (in applications schema)
export const vendorForms = applicationsSchema.table('vendor_forms', {
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

// Credit Approval Decisions table (in applications schema)
export const creditApprovals = applicationsSchema.table('credit_approvals', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => customerApplications.id).notNull(),
  decision: text('decision').notNull(), // 'APPROVE', 'DENY', 'PENDING'
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
export type DigitalSignature = typeof digitalSignatures.$inferSelect;
export type VendorForm = typeof vendorForms.$inferSelect;
export type CreditApproval = typeof creditApprovals.$inferSelect;

 