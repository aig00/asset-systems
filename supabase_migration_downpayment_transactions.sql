-- Migration: Create downpayment_transactions table
-- Run this in Supabase SQL Editor to enable multiple downpayments per asset

-- Create downpayment_transactions table to store multiple downpayment records
CREATE TABLE IF NOT EXISTS downpayment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Enable RLS (Row Level Security)
ALTER TABLE downpayment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read transactions
CREATE POLICY "Allow read access to downpayment_transactions"
ON downpayment_transactions FOR SELECT
USING (true);

-- Create policy for authenticated users to insert transactions
CREATE POLICY "Allow insert access to downpayment_transactions"
ON downpayment_transactions FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update transactions
CREATE POLICY "Allow update access to downpayment_transactions"
ON downpayment_transactions FOR UPDATE
USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete transactions
CREATE POLICY "Allow delete access to downpayment_transactions"
ON downpayment_transactions FOR DELETE
USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_downpayment_transactions_asset_id
ON downpayment_transactions(asset_id);

-- Verify table creation (optional)
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'downpayment_transactions';
