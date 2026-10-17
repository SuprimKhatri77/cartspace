package checkout

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/emails"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

var (
	errDiscountNotFound = &Refusal{http.StatusNotFound, constants.DiscountNotFound,
		"That code isn't valid"}
	errDiscountNotStarted = &Refusal{http.StatusConflict, constants.DiscountNotStarted,
		"That code isn't open yet"}
	errDiscountExpired = &Refusal{http.StatusConflict, constants.DiscountExpired,
		"That code has expired"}
	errDiscountUsedUp = &Refusal{http.StatusConflict, constants.DiscountUsedUp,
		"That code has been used up"}
	errDiscountAlreadyUsed = &Refusal{http.StatusConflict, constants.DiscountAlreadyUsed,
		"You've already used that code"}
)

// normalizeCode is how codes are stored: trimmed, upper-case.
func normalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

// discountAmount is what a code takes off items worth subtotal: a percent
// rounded half up, or a fixed amount, never more than the items.
func discountAmount(kind string, value int32, subtotal int64) int64 {
	var amount int64
	switch kind {
	case types.DiscountPercent:
		amount = (subtotal*int64(value) + 50) / 100
	case types.DiscountFixed:
		amount = int64(value)
	}
	return max(0, min(amount, subtotal))
}

// evaluate is whether code applies to items worth subtotal now, given its
// uses so far (orders that weren't cancelled) and the shopper's own, and
// what it takes off.
func evaluate(code db.DiscountCode, subtotal int64, now time.Time, uses, byUser int32) (int64, *Refusal) {
	switch {
	case !code.IsActive:
		return 0, errDiscountNotFound
	case code.StartsAt.Valid && now.Before(code.StartsAt.Time):
		return 0, errDiscountNotStarted
	case code.EndsAt.Valid && !now.Before(code.EndsAt.Time):
		return 0, errDiscountExpired
	case code.MaxRedemptions.Valid && uses >= code.MaxRedemptions.Int32:
		return 0, errDiscountUsedUp
	case code.OncePerCustomer && byUser > 0:
		return 0, errDiscountAlreadyUsed
	case subtotal < int64(code.MinSubtotal):
		return 0, &Refusal{http.StatusConflict, constants.DiscountMinSubtotal,
			fmt.Sprintf("That code needs %s of items in your bag",
				emails.FormatMoney(int64(code.MinSubtotal), constants.Currency))}
	}
	return discountAmount(code.Kind, code.Value, subtotal), nil
}

// discountQueries are the reads applying a code needs: the plain read for
// a preview, the locking one inside checkout.
type discountQueries interface {
	CountDiscountUses(ctx context.Context, arg db.CountDiscountUsesParams) (db.CountDiscountUsesRow, error)
}

// applyDiscount finds code with find and checks it for userID's items worth
// subtotal; an empty code is no discount.
func applyDiscount(
	ctx context.Context,
	q discountQueries,
	find func(context.Context, string) (db.DiscountCode, error),
	code string, userID pgtype.UUID, subtotal int64, now time.Time,
) (db.DiscountCode, int64, error) {
	code = normalizeCode(code)
	if code == "" {
		return db.DiscountCode{}, 0, nil
	}
	found, err := find(ctx, code)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.DiscountCode{}, 0, errDiscountNotFound
	}
	if err != nil {
		return db.DiscountCode{}, 0, fmt.Errorf("discount code: %w", err)
	}
	counts, err := q.CountDiscountUses(ctx, db.CountDiscountUsesParams{UserID: userID, DiscountCodeID: found.ID})
	if err != nil {
		return db.DiscountCode{}, 0, fmt.Errorf("discount uses: %w", err)
	}
	amount, refusal := evaluate(found, subtotal, now, counts.Uses, counts.ByUser)
	if refusal != nil {
		return db.DiscountCode{}, 0, refusal
	}
	return found, amount, nil
}

// PreviewDiscount checks a code against the user's bag as it is now. It
// reserves nothing: checkout checks again, with the code locked.
func (s *Service) PreviewDiscount(ctx context.Context, userID pgtype.UUID, code string) (types.DiscountPreview, error) {
	lines, err := s.queries.GetCartLines(ctx, userID)
	if err != nil {
		return types.DiscountPreview{}, fmt.Errorf("cart lines: %w", err)
	}
	if len(lines) == 0 {
		return types.DiscountPreview{}, errCartEmpty
	}
	subtotal := linesSubtotal(lines)
	found, amount, err := applyDiscount(ctx, s.queries, s.queries.GetDiscountByCode, code, userID, subtotal, s.now())
	if err != nil {
		return types.DiscountPreview{}, err
	}
	return types.DiscountPreview{
		Code:     found.Code,
		Kind:     found.Kind,
		Value:    found.Value,
		Subtotal: subtotal,
		Discount: amount,
		Shipping: constants.ShippingFor(subtotal - amount),
		Total:    subtotal - amount + constants.ShippingFor(subtotal-amount),
	}, nil
}

func linesSubtotal(lines []db.GetCartLinesRow) int64 {
	var subtotal int64
	for _, line := range lines {
		subtotal += int64(line.Price) * int64(line.Quantity)
	}
	return subtotal
}
