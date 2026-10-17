package checkout

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
)

func TestDiscountAmount(t *testing.T) {
	for _, tt := range []struct {
		kind     string
		value    int32
		subtotal int64
		want     int64
	}{
		{"percent", 10, 6200, 620},
		{"percent", 15, 3333, 500}, // 499.95 rounds half up
		{"percent", 15, 3330, 500}, // 499.5 rounds half up
		{"percent", 15, 3329, 499}, // 499.35
		{"percent", 100, 4999, 4999},
		{"percent", 1, 49, 0},
		{"fixed", 500, 6200, 500},
		{"fixed", 9000, 6200, 6200}, // never more than the items
		{"bogus", 10, 6200, 0},
	} {
		if got := discountAmount(tt.kind, tt.value, tt.subtotal); got != tt.want {
			t.Errorf("%s %d of %d = %d, want %d", tt.kind, tt.value, tt.subtotal, got, tt.want)
		}
	}
}

func TestEvaluate(t *testing.T) {
	now := time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)
	at := func(d time.Duration) pgtype.Timestamptz { return pgtype.Timestamptz{Time: now.Add(d), Valid: true} }
	base := db.DiscountCode{Code: "SALE", Kind: "percent", Value: 10, IsActive: true}
	with := func(f func(*db.DiscountCode)) db.DiscountCode { c := base; f(&c); return c }
	for _, tt := range []struct {
		name         string
		code         db.DiscountCode
		subtotal     int64
		uses, byUser int32
		want         int64
		refusal      string
	}{
		{"open code", base, 6000, 0, 0, 600, ""},
		{"switched off reads as unknown", with(func(c *db.DiscountCode) { c.IsActive = false }), 6000, 0, 0, 0, constants.DiscountNotFound},
		{"not started", with(func(c *db.DiscountCode) { c.StartsAt = at(time.Minute) }), 6000, 0, 0, 0, constants.DiscountNotStarted},
		{"started", with(func(c *db.DiscountCode) { c.StartsAt = at(0) }), 6000, 0, 0, 600, ""},
		{"ends this instant", with(func(c *db.DiscountCode) { c.EndsAt = at(0) }), 6000, 0, 0, 0, constants.DiscountExpired},
		{"ends later", with(func(c *db.DiscountCode) { c.EndsAt = at(time.Second) }), 6000, 0, 0, 600, ""},
		{"last use left", with(func(c *db.DiscountCode) { c.MaxRedemptions = pgtype.Int4{Int32: 3, Valid: true} }), 6000, 2, 0, 600, ""},
		{"used up", with(func(c *db.DiscountCode) { c.MaxRedemptions = pgtype.Int4{Int32: 3, Valid: true} }), 6000, 3, 0, 0, constants.DiscountUsedUp},
		{"once: first time", with(func(c *db.DiscountCode) { c.OncePerCustomer = true }), 6000, 5, 0, 600, ""},
		{"once: used already", with(func(c *db.DiscountCode) { c.OncePerCustomer = true }), 6000, 5, 1, 0, constants.DiscountAlreadyUsed},
		{"others' uses don't matter without once", base, 6000, 9, 1, 600, ""},
		{"below the minimum", with(func(c *db.DiscountCode) { c.MinSubtotal = 5000 }), 4999, 0, 0, 0, constants.DiscountMinSubtotal},
		{"at the minimum", with(func(c *db.DiscountCode) { c.MinSubtotal = 5000 }), 5000, 0, 0, 500, ""},
	} {
		got, refusal := evaluate(tt.code, tt.subtotal, now, tt.uses, tt.byUser)
		gotCode := ""
		if refusal != nil {
			gotCode = refusal.Code
		}
		if got != tt.want || gotCode != tt.refusal {
			t.Errorf("%s: %d %q, want %d %q", tt.name, got, gotCode, tt.want, tt.refusal)
		}
	}
	_, refusal := evaluate(with(func(c *db.DiscountCode) { c.MinSubtotal = 5000 }), 100, now, 0, 0)
	if refusal == nil || refusal.Message != "That code needs $50.00 of items in your bag" {
		t.Errorf("min subtotal message = %v", refusal)
	}
}

func TestNormalizeCode(t *testing.T) {
	if got := normalizeCode("  welcome10 "); got != "WELCOME10" {
		t.Errorf("normalizeCode = %q", got)
	}
}

// The free-shipping line goes by the discounted items, and a fully
// discounted bag still pays shipping, so Stripe never sees a 0 total.
func TestShippingAfterDiscount(t *testing.T) {
	for _, tt := range []struct{ subtotal, discount, want int64 }{
		{16000, 0, 0},
		{16000, 1600, constants.FlatShipping}, // 144.00 left: below the line
		{20000, 5000, 0},
		{4000, 4000, constants.FlatShipping},
	} {
		if got := constants.ShippingFor(tt.subtotal - tt.discount); got != tt.want {
			t.Errorf("%d - %d: shipping %d, want %d", tt.subtotal, tt.discount, got, tt.want)
		}
	}
}
