-- ============================================================================
-- Group C — Admin Controls & Attendance
-- TFF Rebuild Plan v1.0 §5.5
-- Date: 2026-05-13
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add is_prime_admin to users_profile
-- The first user registered in the system is designated Prime Admin.
-- ----------------------------------------------------------------------------
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS is_prime_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users_profile.is_prime_admin IS 'The founding admin who can promote/demote other admins';

CREATE INDEX IF NOT EXISTS idx_users_profile_prime_admin
  ON users_profile(is_prime_admin) WHERE is_prime_admin = TRUE;

-- ----------------------------------------------------------------------------
-- 2. Backfill: set the oldest admin as prime admin if none exists
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users_profile WHERE is_prime_admin = TRUE) THEN
    UPDATE users_profile
    SET is_prime_admin = TRUE
    WHERE id = (
      SELECT id FROM users_profile
      WHERE role = 'admin'
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
END $$;
