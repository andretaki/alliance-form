-- Create the alliance_chemical schema
CREATE SCHEMA IF NOT EXISTS alliance_chemical;

-- Create the update trigger function
CREATE OR REPLACE FUNCTION alliance_chemical.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create customer_applications table
CREATE TABLE IF NOT EXISTS alliance_chemical.customer_applications (
	"id" serial PRIMARY KEY NOT NULL,
	"legal_entity_name" text NOT NULL,
	"dba" text,
	"tax_ein" text NOT NULL,
	"duns_number" text,
	"phone_no" text NOT NULL,
	"bill_to_address" text NOT NULL,
	"bill_to_city_state_zip" text NOT NULL,
	"ship_to_address" text NOT NULL,
	"ship_to_city_state_zip" text NOT NULL,
	"buyer_name_email" text NOT NULL,
	"accounts_payable_name_email" text NOT NULL,
	"want_invoices_emailed" boolean DEFAULT false,
	"invoice_email" text,
	"terms_agreed" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create trade_references table
CREATE TABLE IF NOT EXISTS alliance_chemical.trade_references (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"name" text,
	"fax_no" text,
	"address" text,
	"email" text,
	"city_state_zip" text,
	"attn" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create terms table
CREATE TABLE IF NOT EXISTS alliance_chemical.terms (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create digital_signatures table
CREATE TABLE IF NOT EXISTS alliance_chemical.digital_signatures (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"signature_hash" text NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text NOT NULL,
	"signed_document_url" text NOT NULL,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create vendor_forms table
CREATE TABLE IF NOT EXISTS alliance_chemical.vendor_forms (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create international_shipping_requests table
CREATE TABLE IF NOT EXISTS alliance_chemical.international_shipping_requests (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"company" text,
	"shipping_address" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state_province" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text NOT NULL,
	"product_description" text NOT NULL,
	"quantity" text NOT NULL,
	"estimated_value" text NOT NULL,
	"order_request" text NOT NULL,
	"special_instructions" text,
	"shipping_method" text NOT NULL,
	"custom_shipping_method" text,
	"urgency" text NOT NULL,
	"tracking_required" boolean DEFAULT false,
	"insurance_required" boolean DEFAULT false,
	"purpose_of_shipment" text,
	"custom_purpose" text,
	"hs_code" text,
	"country_of_origin" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE alliance_chemical.digital_signatures 
ADD CONSTRAINT IF NOT EXISTS digital_signatures_application_id_fk 
FOREIGN KEY ("application_id") REFERENCES alliance_chemical.customer_applications("id");

ALTER TABLE alliance_chemical.trade_references 
ADD CONSTRAINT IF NOT EXISTS trade_references_application_id_fk 
FOREIGN KEY ("application_id") REFERENCES alliance_chemical.customer_applications("id");

ALTER TABLE alliance_chemical.vendor_forms 
ADD CONSTRAINT IF NOT EXISTS vendor_forms_application_id_fk 
FOREIGN KEY ("application_id") REFERENCES alliance_chemical.customer_applications("id");

-- Add update triggers
CREATE TRIGGER customer_applications_updated_at
    BEFORE UPDATE ON alliance_chemical.customer_applications
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column();

CREATE TRIGGER trade_references_updated_at
    BEFORE UPDATE ON alliance_chemical.trade_references
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column();

CREATE TRIGGER terms_updated_at
    BEFORE UPDATE ON alliance_chemical.terms
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column();

CREATE TRIGGER digital_signatures_updated_at
    BEFORE UPDATE ON alliance_chemical.digital_signatures
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column();

CREATE TRIGGER vendor_forms_updated_at
    BEFORE UPDATE ON alliance_chemical.vendor_forms
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column();

CREATE TRIGGER international_shipping_requests_updated_at
    BEFORE UPDATE ON alliance_chemical.international_shipping_requests
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column(); 