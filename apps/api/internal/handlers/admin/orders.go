package admin

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/checkout"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

const (
	ordersPageSize  int64 = 20
	maxOrdersSearch int   = 100
)

var orderStatuses = map[string]bool{
	"pending": true, "paid": true, "shipped": true, "delivered": true, "cancelled": true, "refunded": true,
}

// orderFilters reads status and q. q is an order number ("1042",
// "CS-1042", "#1042") or else a piece of the customer's email.
func orderFilters(c *gin.Context) (status, email pgtype.Text, num pgtype.Int8, customer pgtype.UUID, ok bool) {
	if s := c.Query("status"); s != "" {
		if !orderStatuses[s] {
			httpx.Fail(c, http.StatusBadRequest, constants.InvalidQueryParam,
				"status must be pending, paid, shipped, delivered, cancelled or refunded")
			return
		}
		status = pgtype.Text{String: s, Valid: true}
	}
	q := strings.TrimSpace(c.Query("q"))
	if utf8.RuneCountInString(q) > maxOrdersSearch {
		httpx.Fail(c, http.StatusBadRequest, constants.InvalidQueryParam, "q must be at most 100 characters")
		return
	}
	if n, isNumber := orderNumber(q); isNumber {
		num = pgtype.Int8{Int64: n, Valid: true}
	} else if q != "" {
		email = pgtype.Text{String: utils.ContainsPattern(q), Valid: true}
	}
	if id := c.Query("customer"); id != "" {
		var err error
		if customer, err = utils.ConvertToUUID(id); err != nil {
			httpx.Fail(c, http.StatusBadRequest, constants.InvalidQueryParam, "customer must be a user ID")
			return
		}
	}
	return status, email, num, customer, true
}

// orderNumber reads "1042", "CS-1042" or "#1042".
func orderNumber(q string) (int64, bool) {
	q = strings.TrimPrefix(strings.TrimPrefix(strings.ToUpper(q), "#"), "CS-")
	n, err := strconv.ParseInt(q, 10, 64)
	return n, err == nil && n > 0
}

// ListOrders is every order, newest first, filtered by status and a search.
func ListOrders(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		page, ok := httpx.ParsePage(c)
		if !ok {
			return
		}
		status, email, number, customer, ok := orderFilters(c)
		if !ok {
			return
		}

		total, err := queries.CountAdminOrders(ctx, db.CountAdminOrdersParams{Status: status, Number: number, EmailPattern: email, UserID: customer})
		if err != nil {
			httpx.Internal(c, "failed to count orders", err)
			return
		}
		if !httpx.CheckPageInRange(c, page, total, ordersPageSize) {
			return
		}
		orders := []db.AdminListOrdersRow{}
		if total > 0 {
			orders, err = queries.AdminListOrders(ctx, db.AdminListOrdersParams{
				Status: status, Number: number, EmailPattern: email, UserID: customer,
				PageLimit: int32(ordersPageSize), PageOffset: httpx.Offset(page, ordersPageSize),
			})
			if err != nil {
				httpx.Internal(c, "failed to list orders", err)
				return
			}
		}
		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Orders fetched",
			Data:    orders,
			Meta:    types.NewPaginationMeta(total, page, ordersPageSize),
		})
	}
}

func pathNumber(c *gin.Context) (int64, bool) {
	number, err := strconv.ParseInt(c.Param("number"), 10, 64)
	if err != nil || number < 1 {
		httpx.Fail(c, http.StatusBadRequest, constants.InvalidOrderNumber, "Invalid order number")
		return 0, false
	}
	return number, true
}

// GetOrder is one order with its items, customer and payment.
func GetOrder(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		number, ok := pathNumber(c)
		if !ok {
			return
		}
		order, err := queries.AdminGetOrder(c.Request.Context(), number)
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.Fail(c, http.StatusNotFound, constants.OrderNotFound, "Order not found")
			return
		}
		if err != nil {
			httpx.Internal(c, "failed to get order", err)
			return
		}
		respondOrder(c, queries, order, "Order fetched")
	}
}

func respondOrder(c *gin.Context, queries *db.Queries, order db.Order, message string) {
	ctx := c.Request.Context()
	items, err := queries.GetOrderItems(ctx, order.ID)
	if err != nil {
		httpx.Internal(c, "failed to get order items", err)
		return
	}
	user, err := queries.GetUserByID(ctx, order.UserID)
	if err != nil {
		httpx.Internal(c, "failed to get the order's customer", err)
		return
	}
	var payment *db.Payment
	p, err := queries.GetOrderPayment(ctx, order.ID)
	switch {
	case err == nil:
		payment = &p
	case !errors.Is(err, pgx.ErrNoRows):
		httpx.Internal(c, "failed to get the order's payment", err)
		return
	}
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Message: message,
		Data: types.AdminOrderDetail{
			Order:    order,
			Items:    items,
			Customer: types.AdminCustomer{ID: utils.UUIDToString(user.ID), Name: user.Name, Email: user.Email},
			Payment:  payment,
		},
	})
}

// changed answers a fulfilment change with the order as it now is.
func changed(c *gin.Context, queries *db.Queries, order db.Order, err error, message string) {
	if err != nil {
		var refusal *checkout.Refusal
		if errors.As(err, &refusal) {
			httpx.Fail(c, refusal.Status, refusal.Code, refusal.Message)
			return
		}
		httpx.Internal(c, "failed to update order", err)
		return
	}
	respondOrder(c, queries, order, message)
}

// ShipOrder marks a paid order shipped.
func ShipOrder(svc *checkout.Service, queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		number, ok := pathNumber(c)
		if !ok {
			return
		}
		req, ok := validator.BindJSON[types.ShipOrder](c)
		if !ok {
			return
		}
		order, err := svc.Ship(c.Request.Context(), number, req.TrackingNumber)
		changed(c, queries, order, err, "Order shipped")
	}
}

// DeliverOrder marks a shipped order delivered.
func DeliverOrder(svc *checkout.Service, queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		number, ok := pathNumber(c)
		if !ok {
			return
		}
		order, err := svc.Deliver(c.Request.Context(), number)
		changed(c, queries, order, err, "Order delivered")
	}
}

// CancelOrder cancels an unpaid order and returns its stock.
func CancelOrder(svc *checkout.Service, queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		number, ok := pathNumber(c)
		if !ok {
			return
		}
		order, err := svc.CancelPending(c.Request.Context(), number)
		changed(c, queries, order, err, "Order cancelled")
	}
}

// RefundOrder refunds a paid order in full through Stripe.
func RefundOrder(svc *checkout.Service, queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !svc.Enabled() {
			httpx.Fail(c, http.StatusServiceUnavailable, constants.PaymentsUnavailable,
				"Payments are not set up on this server")
			return
		}
		number, ok := pathNumber(c)
		if !ok {
			return
		}
		req, ok := validator.BindJSON[types.RefundOrder](c)
		if !ok {
			return
		}
		order, err := svc.RefundPaid(c.Request.Context(), number, *req.Restock)
		changed(c, queries, order, err, "Order refunded")
	}
}
