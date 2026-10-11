-- name: EnqueueEmail :exec
INSERT INTO email_outbox (kind, order_id) VALUES (@kind, @order_id)
ON CONFLICT (order_id, kind) DO NOTHING;

-- name: ClaimDueEmails :many
-- Leases a batch of due emails: each is skipped by other senders for
-- lease_seconds, so no transaction stays open while it is sent, and one
-- whose send never finished (a crash) is taken again after that.
UPDATE email_outbox
SET next_attempt_at = now() + make_interval(secs => sqlc.arg(lease_seconds)::int),
    attempts = attempts + 1
WHERE id IN (
    SELECT id FROM email_outbox
    WHERE status = 'pending' AND next_attempt_at <= now()
    ORDER BY next_attempt_at
    LIMIT sqlc.arg(batch)
    FOR UPDATE SKIP LOCKED
)
RETURNING *;

-- name: MarkEmailSent :exec
UPDATE email_outbox SET status = 'sent', sent_at = now(), last_error = NULL
WHERE id = @id;

-- name: RetryEmail :exec
UPDATE email_outbox
SET next_attempt_at = now() + make_interval(secs => sqlc.arg(delay_seconds)::int),
    last_error = @last_error
WHERE id = @id;

-- name: FailEmail :exec
UPDATE email_outbox SET status = 'failed', last_error = @last_error
WHERE id = @id;

-- name: GetEmailOrder :one
-- The order an email is about, with the customer's name for the greeting.
SELECT sqlc.embed(orders), users.name AS customer_name
FROM orders JOIN users ON users.id = orders.user_id
WHERE orders.id = @id;
