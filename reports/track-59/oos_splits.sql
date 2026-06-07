
-- TRACK-59: Out-of-Sample Split Definitions
-- TRAIN: 2019-01-01 to 2022-12-31
-- VALIDATION: 2023-01-01 to 2023-12-31
-- TEST: 2024-01-01 to 2025-06-30

-- Get training predictions only
CREATE VIEW IF NOT EXISTS v_train_predictions AS
SELECT * FROM alpha_research_registry
WHERE prediction_date BETWEEN '2019-01-01' AND '2022-12-31';

-- Get validation predictions only
CREATE VIEW IF NOT EXISTS v_validation_predictions AS
SELECT * FROM alpha_research_registry
WHERE prediction_date BETWEEN '2023-01-01' AND '2023-12-31';

-- Get test predictions only
CREATE VIEW IF NOT EXISTS v_test_predictions AS
SELECT * FROM alpha_research_registry
WHERE prediction_date >= '2024-01-01';

-- Never compute metrics from training data.
-- All published hit rates must use v_test_predictions.
