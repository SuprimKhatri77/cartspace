package checkout

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func TestSessionRequest(t *testing.T) {
	s := &Service{frontendURL: "http://localhost:3000"}
	expires := time.Date(2026, 10, 10, 12, 31, 0, 0, time.UTC)
	order := db.Order{
		ID:        pgtype.UUID{Bytes: [16]byte{1}, Valid: true},
		Number:    1042,
		Shipping:  800,
		Currency:  "usd",
		ExpiresAt: pgtype.Timestamptz{Time: expires, Valid: true},
	}
	lines := []db.GetCartLinesRow{
		{ProductName: "Tee", Price: 2500, Quantity: 2, Image: "https://img/tee.jpg",
			Options: []any{map[string]any{"name": "color", "value": "Black"}, map[string]any{"name": "size", "value": "M"}}},
		{ProductName: "Mug", Price: 1200, Quantity: 1, Options: []any{}},
	}

	req := s.sessionRequest(order, "a@b.co", lines)

	if req.SuccessURL != "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}" ||
		req.CancelURL != "http://localhost:3000/cart?checkout=cancelled" {
		t.Errorf("return urls = %q %q", req.SuccessURL, req.CancelURL)
	}
	if req.OrderID != "01000000-0000-0000-0000-000000000000" || req.OrderNumber != 1042 || req.Shipping != 800 || !req.ExpiresAt.Equal(expires) {
		t.Errorf("unexpected request: %+v", req)
	}
	if got := req.Items[0]; got.Name != "Tee (Black / M)" || got.UnitAmount != 2500 || got.Quantity != 2 || got.Image != "https://img/tee.jpg" {
		t.Errorf("first item = %+v", got)
	}
	if got := req.Items[1]; got.Name != "Mug" || got.UnitAmount != 1200 {
		t.Errorf("second item = %+v", got)
	}
}

func TestSessionRequestDiscount(t *testing.T) {
	s := &Service{frontendURL: "http://localhost:3000"}
	order := db.Order{
		ID: pgtype.UUID{Bytes: [16]byte{1}, Valid: true}, Number: 1043, Currency: "usd",
		Subtotal: 6200, Discount: 620, DiscountCode: pgtype.Text{String: "WELCOME10", Valid: true},
		Shipping: 800, Total: 6380,
	}
	req := s.sessionRequest(order, "a@b.co", []db.GetCartLinesRow{{ProductName: "Tee", Price: 3100, Quantity: 2}})
	if req.Discount != 620 || req.DiscountName != "WELCOME10" {
		t.Errorf("discount = %d %q", req.Discount, req.DiscountName)
	}
	// What Stripe will charge: the items, less the coupon, plus shipping.
	var items int64
	for _, it := range req.Items {
		items += it.UnitAmount * it.Quantity
	}
	if items-req.Discount+req.Shipping != int64(order.Total) {
		t.Errorf("stripe total %d != order total %d", items-req.Discount+req.Shipping, order.Total)
	}
	if none := s.sessionRequest(db.Order{Currency: "usd"}, "a@b.co", nil); none.Discount != 0 || none.DiscountName != "" {
		t.Errorf("no discount: %+v", none)
	}
}

func TestNormalizeAddress(t *testing.T) {
	got := normalizeAddress(types.AddressInput{
		FullName: "  Ada   Lovelace ", Phone: " +1 555  0100", Line1: "12  Main St",
		City: " Springfield ", PostalCode: " sw1a 1aa ", Country: "GB",
	})
	want := types.AddressInput{
		FullName: "Ada Lovelace", Phone: "+1 555 0100", Line1: "12 Main St",
		City: "Springfield", PostalCode: "SW1A 1AA", Country: "GB",
	}
	if got != want {
		t.Errorf("normalizeAddress = %+v, want %+v", got, want)
	}
}

func TestCreateAddressParams(t *testing.T) {
	a := types.AddressInput{FullName: "Ada", Phone: "5550100", Line1: "1 Main", City: "X", PostalCode: "1", Country: "GB"}
	for _, isDefault := range []bool{false, true} {
		got := createAddressParams(pgtype.UUID{}, a, isDefault)
		if got.IsDefault != isDefault || got.FullName != "Ada" || got.Line2.Valid {
			t.Errorf("createAddressParams(default=%v) = %+v", isDefault, got)
		}
	}
}

func TestOptionSuffix(t *testing.T) {
	if got := optionSuffix(nil); got != "" {
		t.Errorf("nil options = %q", got)
	}
	if got := optionSuffix([]any{}); got != "" {
		t.Errorf("no options = %q", got)
	}
	if got := optionSuffix([]any{map[string]any{"value": "Rust"}}); got != " (Rust)" {
		t.Errorf("one option = %q", got)
	}
}

func TestShippingFor(t *testing.T) {
	for _, tt := range []struct{ subtotal, want int64 }{
		{1, constants.FlatShipping},
		{constants.FreeShippingFrom - 1, constants.FlatShipping},
		{constants.FreeShippingFrom, 0},
	} {
		if got := constants.ShippingFor(tt.subtotal); got != tt.want {
			t.Errorf("ShippingFor(%d) = %d, want %d", tt.subtotal, got, tt.want)
		}
	}
}

func TestDisabledWithoutProvider(t *testing.T) {
	var nilService *Service
	if nilService.Enabled() || (&Service{}).Enabled() {
		t.Error("a service without a provider must report disabled")
	}
}
