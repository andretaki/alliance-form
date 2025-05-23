import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

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
});

// Trade References table
export const tradeReferences = pgTable('trade_references', {
  id: serial('id').primaryKey(),
  applicationId: serial('application_id').references(() => customerApplications.id),
  name: text('name'),
  faxNo: text('fax_no'),
  address: text('address'),
  email: text('email'),
  cityStateZip: text('city_state_zip'),
  attn: text('attn'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}); 