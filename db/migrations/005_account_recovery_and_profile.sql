-- Password recovery and user profile images
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_ip_hash varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_active
  ON password_reset_tokens(user_id, expires_at DESC)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS user_profile_images (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_type varchar(40) NOT NULL,
  file_name varchar(180) NOT NULL,
  size_bytes integer NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 2097152),
  image_data bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profile_images_org ON user_profile_images(organization_id);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON password_reset_tokens FROM anon, authenticated;
REVOKE ALL ON user_profile_images FROM anon, authenticated;

COMMENT ON TABLE password_reset_tokens IS 'Single-use, hashed password reset tokens. Raw reset tokens are never stored.';
COMMENT ON TABLE user_profile_images IS 'Private user profile images served only through authenticated application routes.';
