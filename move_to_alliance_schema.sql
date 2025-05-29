-- First, create the alliance_chemical schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS alliance_chemical;

-- Move tables to alliance_chemical schema
ALTER TABLE customer_applications SET SCHEMA alliance_chemical;
ALTER TABLE trade_references SET SCHEMA alliance_chemical;
ALTER TABLE terms SET SCHEMA alliance_chemical;
ALTER TABLE digital_signatures SET SCHEMA alliance_chemical;
ALTER TABLE international_shipping_requests SET SCHEMA alliance_chemical;
ALTER TABLE vendor_forms SET SCHEMA alliance_chemical;

-- Move the trigger function to alliance_chemical schema
ALTER FUNCTION update_updated_at_column() SET SCHEMA alliance_chemical; 