-- Migration: Move customer applications to dedicated schema
-- Run this script to reorganize your database structure

-- 1. Create the new applications schema
CREATE SCHEMA IF NOT EXISTS applications;

-- 2. Create the update trigger function in the new schema
CREATE OR REPLACE FUNCTION applications.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create customer_applications table in new schema
CREATE TABLE applications.customer_applications (
    id                          serial PRIMARY KEY,
    legal_entity_name           text                                NOT NULL,
    dba                        text,
    tax_ein                    text                                NOT NULL,
    duns_number                text,
    phone_no                   text                                NOT NULL,
    bill_to_address            text                                NOT NULL,
    bill_to_city_state_zip     text                                NOT NULL,
    ship_to_address            text                                NOT NULL,
    ship_to_city_state_zip     text                                NOT NULL,
    buyer_name_email           text                                NOT NULL,
    accounts_payable_name_email text                               NOT NULL,
    want_invoices_emailed      boolean DEFAULT false,
    invoice_email              text,
    terms_agreed               boolean                             NOT NULL,
    created_at                 timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at                 timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Create trade_references table in new schema
CREATE TABLE applications.trade_references (
    id               serial PRIMARY KEY,
    application_id   integer,
    name            text,
    fax_no          text,
    address         text,
    email           text,
    city_state_zip  text,
    attn            text,
    created_at      timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Create digital_signatures table in new schema  
CREATE TABLE applications.digital_signatures (
    id                  serial PRIMARY KEY,
    application_id      integer,
    signature_hash      text                                NOT NULL,
    ip_address         text                                NOT NULL,
    user_agent         text                                NOT NULL,
    signed_document_url text                                NOT NULL,
    signed_at          timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at         timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at         timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Create vendor_forms table in new schema
CREATE TABLE applications.vendor_forms (
    id           serial PRIMARY KEY,
    application_id integer,
    file_name    text                                NOT NULL,
    file_url     text                                NOT NULL,
    file_type    text                                NOT NULL,
    file_size    integer                             NOT NULL,
    uploaded_at  timestamp                           NOT NULL,
    created_at   timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at   timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Create credit_approvals table in new schema
CREATE TABLE applications.credit_approvals (
    id               serial PRIMARY KEY,
    application_id   integer                             NOT NULL,
    decision        text                                NOT NULL, -- 'APPROVED', 'DENIED', 'PENDING'
    approved_amount integer,                                      -- Amount in cents
    approved_terms  text,                                         -- e.g. 'Net 30'
    approver_email  text,
    approver_notes  text,
    customer_notified boolean DEFAULT false,
    created_at      timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Add foreign key constraints
ALTER TABLE applications.trade_references 
ADD CONSTRAINT trade_references_application_id_fk 
FOREIGN KEY (application_id) REFERENCES applications.customer_applications(id);

ALTER TABLE applications.digital_signatures 
ADD CONSTRAINT digital_signatures_application_id_fk 
FOREIGN KEY (application_id) REFERENCES applications.customer_applications(id);

ALTER TABLE applications.vendor_forms 
ADD CONSTRAINT vendor_forms_application_id_fk 
FOREIGN KEY (application_id) REFERENCES applications.customer_applications(id);

ALTER TABLE applications.credit_approvals 
ADD CONSTRAINT credit_approvals_application_id_fk 
FOREIGN KEY (application_id) REFERENCES applications.customer_applications(id);

-- 9. Create indexes for performance
CREATE INDEX idx_customer_applications_created_at 
ON applications.customer_applications (created_at);

CREATE INDEX idx_customer_applications_tax_ein 
ON applications.customer_applications (tax_ein);

CREATE INDEX idx_trade_references_application_id 
ON applications.trade_references (application_id);

CREATE INDEX idx_digital_signatures_application_id 
ON applications.digital_signatures (application_id);

CREATE INDEX idx_vendor_forms_application_id 
ON applications.vendor_forms (application_id);

CREATE INDEX idx_credit_approvals_application_id 
ON applications.credit_approvals (application_id);

-- 10. Add update triggers
CREATE TRIGGER customer_applications_updated_at
    BEFORE UPDATE ON applications.customer_applications
    FOR EACH ROW
    EXECUTE FUNCTION applications.update_updated_at_column();

CREATE TRIGGER trade_references_updated_at
    BEFORE UPDATE ON applications.trade_references
    FOR EACH ROW
    EXECUTE FUNCTION applications.update_updated_at_column();

CREATE TRIGGER digital_signatures_updated_at
    BEFORE UPDATE ON applications.digital_signatures
    FOR EACH ROW
    EXECUTE FUNCTION applications.update_updated_at_column();

CREATE TRIGGER vendor_forms_updated_at
    BEFORE UPDATE ON applications.vendor_forms
    FOR EACH ROW
    EXECUTE FUNCTION applications.update_updated_at_column();

CREATE TRIGGER credit_approvals_updated_at
    BEFORE UPDATE ON applications.credit_approvals
    FOR EACH ROW
    EXECUTE FUNCTION applications.update_updated_at_column();

-- 11. Grant permissions (adjust as needed for your database user)
ALTER TABLE applications.customer_applications OWNER TO "default";
ALTER TABLE applications.trade_references OWNER TO "default";
ALTER TABLE applications.digital_signatures OWNER TO "default";
ALTER TABLE applications.vendor_forms OWNER TO "default";
ALTER TABLE applications.credit_approvals OWNER TO "default";

-- 12. Copy data from old schema (if you have existing data)
-- Uncomment these lines if you need to migrate existing data:

-- INSERT INTO applications.customer_applications 
-- SELECT * FROM alliance_chemical.customer_applications;

-- INSERT INTO applications.trade_references 
-- SELECT * FROM alliance_chemical.trade_references;

-- INSERT INTO applications.digital_signatures 
-- SELECT * FROM alliance_chemical.digital_signatures;

-- INSERT INTO applications.vendor_forms 
-- SELECT * FROM alliance_chemical.vendor_forms;

-- INSERT INTO applications.credit_approvals 
-- SELECT * FROM alliance_chemical.credit_approvals;

-- 13. Drop old tables (ONLY after confirming data migration worked)
-- Uncomment these lines ONLY after you've verified the migration:

-- DROP TABLE IF EXISTS alliance_chemical.credit_approvals;
-- DROP TABLE IF EXISTS alliance_chemical.vendor_forms;
-- DROP TABLE IF EXISTS alliance_chemical.digital_signatures;
-- DROP TABLE IF EXISTS alliance_chemical.trade_references;
-- DROP TABLE IF EXISTS alliance_chemical.customer_applications; 