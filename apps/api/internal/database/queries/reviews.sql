-- name: GetStorefrontProductIDBySlug :one
SELECT id FROM storefront_products WHERE slug = $1;

-- name: CountPublishedReviews :one
SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND status = 'published';

-- name: ListPublishedReviews :many
SELECT r.id, r.rating, r.title, r.body, r.created_at, r.updated_at, u.name AS author_name
FROM reviews r
JOIN users u ON u.id = r.user_id
WHERE r.product_id = $1 AND r.status = 'published'
ORDER BY r.created_at DESC, r.id DESC
LIMIT $2 OFFSET $3;

-- name: ReviewDistribution :many
-- Published reviews per star; stars without any are left out.
SELECT rating, COUNT(*)::int AS count
FROM reviews
WHERE product_id = $1 AND status = 'published'
GROUP BY rating;

-- name: GetMyReview :one
SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2;

-- name: HasBoughtProduct :one
-- Whether a paid (or later) order of the user's holds the product.
SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = @user_id
    AND oi.product_id = @product_id
    AND o.status IN ('paid', 'shipped', 'delivered')
);

-- name: UpsertReview :one
-- Writing again edits the review; a hidden review stays hidden.
INSERT INTO reviews (product_id, user_id, rating, title, body)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (product_id, user_id) DO UPDATE
SET rating = EXCLUDED.rating, title = EXCLUDED.title, body = EXCLUDED.body
RETURNING *;

-- name: DeleteReview :execrows
DELETE FROM reviews WHERE product_id = $1 AND user_id = $2;
