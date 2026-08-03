-- Migration 054: Rename transaction_value_inr -> transaction_value_php
-- corporate_insider_disclosures (migration 048) stores PSE-listed company
-- filings priced in PHP; the column was left over from the pre-migration
-- India-market version of this table and never renamed.
ALTER TABLE corporate_insider_disclosures
    RENAME COLUMN transaction_value_inr TO transaction_value_php;
