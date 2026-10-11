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
	Items    []db.OrderItem `json:"items"`
	Customer AdminCustomer  `json:"customer"`
	Payment  *db.Payment    `json:"payment"`
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
