-- Create international_shipping_requests table
CREATE TABLE IF NOT EXISTS alliance_chemical.international_shipping_requests (
    id SERIAL PRIMARY KEY,
    -- Contact Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    
    -- Shipping Address
    shipping_address TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state_province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    
    -- Order Details
    product_description TEXT NOT NULL,
    quantity TEXT NOT NULL,
    estimated_value TEXT NOT NULL,
    order_request TEXT NOT NULL,
    special_instructions TEXT,
    
    -- Shipping Preferences
    shipping_method TEXT NOT NULL,
    custom_shipping_method TEXT,
    urgency TEXT NOT NULL,
    tracking_required BOOLEAN DEFAULT FALSE,
    insurance_required BOOLEAN DEFAULT FALSE,
    
    -- Customs & Declaration
    purpose_of_shipment TEXT,
    custom_purpose TEXT,
    hs_code TEXT,
    country_of_origin TEXT,
    
    -- Status and Timestamps
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_international_shipping_requests_email ON alliance_chemical.international_shipping_requests(email);
CREATE INDEX IF NOT EXISTS idx_international_shipping_requests_status ON alliance_chemical.international_shipping_requests(status);

-- Add trigger for updating the updated_at timestamp
CREATE TRIGGER update_international_shipping_requests_updated_at
    BEFORE UPDATE ON alliance_chemical.international_shipping_requests
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column(); 