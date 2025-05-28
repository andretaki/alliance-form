-- Create vendor_forms table
CREATE TABLE IF NOT EXISTS alliance_chemical.vendor_forms (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES alliance_chemical.customer_applications(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS vendor_forms_application_id_idx ON alliance_chemical.vendor_forms(application_id);

-- Create trigger for updating updated_at
CREATE TRIGGER vendor_forms_updated_at
    BEFORE UPDATE ON alliance_chemical.vendor_forms
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column(); 