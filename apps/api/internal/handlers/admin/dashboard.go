// Package admin serves admin-wide endpoints: the dashboard and uploads.
package admin

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"golang.org/x/sync/errgroup"
)

// LowStockThreshold: active variants at or below it are flagged.
const LowStockThreshold = 5

// UploadFolder is where admin uploads land on Cloudinary.
const UploadFolder = "cartspace/products"

type Stats struct {
	Revenue           int64                     `json:"revenue"`
	Orders            int64                     `json:"orders"`
	AverageOrderValue int64                     `json:"average_order_value"`
	Customers         int64                     `json:"customers"`
	SalesByDay        []db.AdminSalesByDayRow   `json:"sales_by_day"`
	LowStock          []db.AdminLowStockRow     `json:"low_stock"`
	RecentOrders      []db.AdminRecentOrdersRow `json:"recent_orders"`
}

// GetStats is the dashboard: sales totals, the last 30 days by day, low
// stock and recent orders. Sales are paid, shipped or delivered orders.
func GetStats(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		var (
			stats  Stats
			totals db.AdminSalesTotalsRow
		)
		g, ctx := errgroup.WithContext(c.Request.Context())
		g.Go(func() (err error) { totals, err = queries.AdminSalesTotals(ctx); return })
		g.Go(func() (err error) { stats.Customers, err = queries.AdminCustomerCount(ctx); return })
		g.Go(func() (err error) { stats.SalesByDay, err = queries.AdminSalesByDay(ctx); return })
		g.Go(func() (err error) { stats.LowStock, err = queries.AdminLowStock(ctx, LowStockThreshold); return })
		g.Go(func() (err error) { stats.RecentOrders, err = queries.AdminRecentOrders(ctx); return })
		if err := g.Wait(); err != nil {
			httpx.Internal(c, "failed to load dashboard", err)
			return
		}
		stats.Revenue, stats.Orders = totals.Revenue, totals.Orders
		if stats.Orders > 0 {
			stats.AverageOrderValue = stats.Revenue / stats.Orders
		}
		c.JSON(http.StatusOK, types.APIResponse{Success: true, Message: "Stats fetched", Data: stats})
	}
}

// SignUpload returns a signature for one direct browser upload to
// Cloudinary (valid for an hour), so image bytes never pass through us.
func SignUpload(cld *cloudinary.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		sig, err := cld.SignUpload(UploadFolder, time.Now().Unix())
		if err != nil {
			httpx.Internal(c, "failed to sign upload", err)
			return
		}
		c.JSON(http.StatusOK, types.APIResponse{Success: true, Message: "Upload signed", Data: sig})
	}
}
