-- Migration 033: Waitlist entries and feedback submissions
-- Supports beta access management and user feedback collection

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  name VARCHAR(200),
  source VARCHAR(100) DEFAULT 'web',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invited', 'active', 'declined')),
  position INTEGER,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_status ON waitlist_entries(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_created_at ON waitlist_entries(created_at);

CREATE TABLE IF NOT EXISTS feedback_entries (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('bug', 'feature-request', 'accuracy', 'ux', 'data-quality', 'content', 'other')),
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  email VARCHAR(320),
  page_url TEXT,
  user_id VARCHAR(200),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'triaged', 'resolved')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_status ON feedback_entries(status);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_category ON feedback_entries(category);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_created_at ON feedback_entries(created_at);
