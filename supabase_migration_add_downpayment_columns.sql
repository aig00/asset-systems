-- Migration: Add downpayment columns to assets table
-- Run this in Supabase SQL Editor to fix the missing columns error

-- Add downpayment_amount column to assets table (numeric type for money)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS downpayment_amount numeric DEFAULT 0;

-- Add downpayment_description column to assets table (text type for notes)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS downpayment_description text DEFAULT '';

-- Verify the columns were added (optional - for checking)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'assets' 
-- AND column_name IN ('downpayment_amount', 'downpayment_description');
