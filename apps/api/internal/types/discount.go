package types

import (
	"time"
)

// DiscountKind values: percent off the items, or a fixed amount (cents).
const (
	DiscountPercent = "percent"
	DiscountFixed   = "fixed"
)

// DiscountCodeInput creates or replaces a discount code. Amounts are cents;
// a percent value is 1 to 100 (checked with the other cross-field rules by
// the handler).
type DiscountCodeInput struct {
	Code            string     `json:"code" binding:"required,discountcode"`
	Kind            string     `json:"kind" binding:"required,oneof=percent fixed"`
	Value           int32      `json:"value" binding:"required,gt=0,max=100000000"`
	MinSubtotal     int32      `json:"min_subtotal" label:"Minimum spend" binding:"min=0,max=100000000"`
	StartsAt        *time.Time `json:"starts_at"`
	EndsAt          *time.Time `json:"ends_at"`
	MaxRedemptions  *int32     `json:"max_redemptions" label:"Use limit" binding:"omitempty,gt=0,max=1000000"`
	OncePerCustomer bool       `json:"once_per_customer"`
	IsActive        *bool      `json:"is_active" binding:"required"`
}
