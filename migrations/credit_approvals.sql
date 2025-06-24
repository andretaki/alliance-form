-- Create credit_approvals table for storing approval decisions
CREATE TABLE IF NOT EXISTS alliance_chemical.credit_approvals (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES alliance_chemical.customer_applications(id),
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'DENIED', 'PENDING')),
    approved_amount INTEGER, -- Amount in cents (e.g., 1000000 = $10,000)
    approved_terms TEXT DEFAULT 'Net 30',
    approver_email TEXT,
    approver_notes TEXT,
    customer_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_approvals_application_id ON alliance_chemical.credit_approvals(application_id);
CREATE INDEX IF NOT EXISTS idx_credit_approvals_decision ON alliance_chemical.credit_approvals(decision);

-- Add trigger for updating the updated_at timestamp
CREATE TRIGGER update_credit_approvals_updated_at
    BEFORE UPDATE ON alliance_chemical.credit_approvals
    FOR EACH ROW
    EXECUTE FUNCTION alliance_chemical.update_updated_at_column(); 