-- Migration: Update alliance_chemical schema for remaining tables
-- This keeps terms and international shipping in the alliance_chemical schema

-- Ensure the alliance_chemical schema exists
CREATE SCHEMA IF NOT EXISTS alliance_chemical;

-- Create/update the trigger function for alliance_chemical schema
CREATE OR REPLACE FUNCTION alliance_chemical.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Terms table (company-wide terms and conditions)
CREATE TABLE IF NOT EXISTS alliance_chemical.terms (
    id              serial PRIMARY KEY,
    title           text                                NOT NULL,
    content         text                                NOT NULL,
    version         text DEFAULT '1.0'                  NOT NULL,
    order_index     integer DEFAULT 0                   NOT NULL,
    is_active       boolean DEFAULT true                NOT NULL,
    effective_date  timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at      timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at      timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- International Shipping Requests table
CREATE TABLE IF NOT EXISTS alliance_chemical.international_shipping_requests (
    id                      serial PRIMARY KEY,
    first_name              text                                NOT NULL,
    last_name               text                                NOT NULL,
    email                   text                                NOT NULL,
    phone                   text                                NOT NULL,
    company                 text,
    shipping_address        text                                NOT NULL,
    address_line2           text,
    city                    text                                NOT NULL,
    state_province          text                                NOT NULL,
    postal_code             text                                NOT NULL,
    country                 text                                NOT NULL,
    product_description     text                                NOT NULL,
    quantity                text                                NOT NULL,
    estimated_value         text                                NOT NULL,
    order_request           text                                NOT NULL,
    special_instructions    text,
    shipping_method         text                                NOT NULL,
    custom_shipping_method  text,
    urgency                 text                                NOT NULL,
    tracking_required       boolean DEFAULT false,
    insurance_required      boolean DEFAULT false,
    purpose_of_shipment     text,
    custom_purpose          text,
    hs_code                 text,
    country_of_origin       text,
    status                  text DEFAULT 'pending',
    created_at              timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at              timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Add update triggers
CREATE TRIGGER terms_updated_at
    BEFORE UPDATE ON alliance_chemical.terms
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column();

CREATE TRIGGER international_shipping_requests_updated_at
    BEFORE UPDATE ON alliance_chemical.international_shipping_requests
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_terms_is_active 
ON alliance_chemical.terms (is_active);

CREATE INDEX IF NOT EXISTS idx_terms_effective_date 
ON alliance_chemical.terms (effective_date);

CREATE INDEX IF NOT EXISTS idx_shipping_requests_created_at 
ON alliance_chemical.international_shipping_requests (created_at);

CREATE INDEX IF NOT EXISTS idx_shipping_requests_status 
ON alliance_chemical.international_shipping_requests (status);

CREATE INDEX IF NOT EXISTS idx_shipping_requests_email 
ON alliance_chemical.international_shipping_requests (email);

-- Grant permissions
ALTER TABLE alliance_chemical.terms OWNER TO "default";
ALTER TABLE alliance_chemical.international_shipping_requests OWNER TO "default"; 