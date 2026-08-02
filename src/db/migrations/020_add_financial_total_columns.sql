-- 020_add_financial_total_columns.sql
-- Add balance sheet total columns to financial_snapshots for IndianAPI integration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'total_assets') THEN
    ALTER TABLE financial_snapshots ADD COLUMN total_assets REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'total_liabilities') THEN
    ALTER TABLE financial_snapshots ADD COLUMN total_liabilities REAL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'total_equity') THEN
    ALTER TABLE financial_snapshots ADD COLUMN total_equity REAL;
  END IF;
END $$;
