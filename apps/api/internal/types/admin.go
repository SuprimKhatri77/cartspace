package types

import db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"

// AdminCustomer is who placed an order.
type AdminCustomer struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// AdminOrderDetail is an order as the admin sees it: what was bought, by
// whom, and the payment (null until it is paid).
type AdminOrderDetail struct {
	db.Order
	Items    []AdminOrderItem `json:"items"`
	Customer AdminCustomer    `json:"customer"`
	Payment  *db.Payment      `json:"payment"`
}

// AdminOrderItem is an order line with how many of it weren't in stock when
// it was paid for (the shopper never sees that).
type AdminOrderItem struct {
	db.OrderItem
	StockShortfall int32 `json:"stock_shortfall"`
}

// NewAdminOrderItems adds each line's shortfall.
func NewAdminOrderItems(items []db.OrderItem) []AdminOrderItem {
	out := make([]AdminOrderItem, len(items))
	for i, item := range items {
		out[i] = AdminOrderItem{OrderItem: item, StockShortfall: item.StockShortfall}
	}
	return out
}

type ShipOrder struct {
	TrackingNumber string `json:"tracking_number" label:"Tracking number" binding:"omitempty,max=64"`
}

type RefundOrder struct {
	// Return the items to stock: yes for an order that never shipped or
	// came back.
	Restock *bool `json:"restock" binding:"required"`
}

type ReviewStatus struct {
	Status string `json:"status" binding:"required,oneof=published hidden"`
}

// BulkProducts hides, shows or deletes several products at once.
type BulkProducts struct {
	Action string   `json:"action" binding:"required,oneof=hide show delete"`
	IDs    []string `json:"ids" label:"Products" binding:"required,min=1,max=100,dive,uuid"`
}

// BulkResult says how many of the products changed (a product already
// hidden isn't hidden again; a missing one isn't deleted).
type BulkResult struct {
	Affected int `json:"affected"`
}

// BulkShip marks several paid orders shipped, without tracking numbers.
type BulkShip struct {
	Numbers []int64 `json:"numbers" label:"Orders" binding:"required,min=1,max=50,dive,gt=0"`
}

// ShipResult is one order's answer: shipped, or why not.
type ShipResult struct {
	Number  int64  `json:"number"`
	Shipped bool   `json:"shipped"`
	Code    string `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

type BulkShipResult struct {
	Shipped int          `json:"shipped"`
	Results []ShipResult `json:"results"`
}
