ALTER TABLE refresh_tokens
 ADD COLUMN session_id UUID NOT NULL,
 ADD COLUMN revoked_at TIMESTAMPTZ;

CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens(session_id);