package admin

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
)

func TestSafeCell(t *testing.T) {
	for in, want := range map[string]string{
		"Ada Lovelace":       "Ada Lovelace",
		"=HYPERLINK(\"x\")":  "'=HYPERLINK(\"x\")",
		"+44 20 7946 0958":   "'+44 20 7946 0958",
		"-1+1":               "'-1+1",
		"@SUM(A1)":           "'@SUM(A1)",
		"\tcmd":              "'\tcmd",
		"":                   "",
		"ada@example.org":    "ada@example.org",
		"1Z999AA10123456784": "1Z999AA10123456784",
	} {
		if got := safeCell(in); got != want {
			t.Errorf("safeCell(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMoney(t *testing.T) {
	for cents, want := range map[int64]string{0: "0.00", 5: "0.05", 1250: "12.50", 123456: "1234.56"} {
		if got := money(cents); got != want {
			t.Errorf("money(%d) = %q, want %q", cents, got, want)
		}
	}
}

// Bad filters are refused before any query runs (the handlers get no DB).
func TestOrderFiltersRefused(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/orders", ListOrders(nil))
	r.GET("/export", ExportOrders(nil))
	r.GET("/search", Search(nil))
	r.GET("/customers", ListCustomers(nil))
	for _, path := range []string{
		"/orders?from=12-10-2026",
		"/orders?from=2026-10-12&to=2026-10-01",
		"/orders?sort=email",
		"/orders?sort=total&dir=sideways",
		"/export?to=yesterday",
		"/search?q=",
		"/search?q=" + strings.Repeat("a", 101),
		"/customers?sort=name",
	} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		if w.Code != http.StatusBadRequest || !strings.Contains(w.Body.String(), constants.InvalidQueryParam) {
			t.Errorf("%s: %d %s, want 400", path, w.Code, w.Body.String())
		}
	}
}

func TestExportRecordMatchesHeader(t *testing.T) {
	row := db.AdminExportOrdersRow{
		Number: 1042, Status: "paid", Subtotal: 6200, Discount: 620,
		DiscountCode: pgtype.Text{String: "=WELCOME10", Valid: true}, Shipping: 800, Total: 6380, Currency: "usd",
	}
	rec := exportRecord(row)
	if len(rec) != len(exportHeader) {
		t.Fatalf("%d cells for %d columns", len(rec), len(exportHeader))
	}
	col := func(name string) string {
		for i, h := range exportHeader {
			if h == name {
				return rec[i]
			}
		}
		return "missing"
	}
	if col("discount") != "6.20" || col("discount_code") != "'=WELCOME10" || col("total") != "63.80" {
		t.Errorf("discount %q code %q total %q", col("discount"), col("discount_code"), col("total"))
	}
}

func TestCustomerRecord(t *testing.T) {
	joined := time.Date(2026, 10, 1, 9, 0, 0, 0, time.UTC)
	rec := customerRecord(db.AdminListCustomersRow{
		Name: "@Ada", Email: "ada@example.com", CreatedAt: pgtype.Timestamptz{Time: joined, Valid: true},
		Orders: 3, Spend: 12345,
	})
	want := []string{"'@Ada", "ada@example.com", "2026-10-01T09:00:00Z", "3", "123.45", ""}
	if strings.Join(rec, "|") != strings.Join(want, "|") || len(rec) != len(customerExportHeader) {
		t.Errorf("record = %q", rec)
	}
}

func TestCustomerExportRefused(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/customers/export.csv", ExportCustomers(nil))
	for _, path := range []string{
		"/customers/export.csv?q=" + strings.Repeat("a", 101),
		"/customers/export.csv?sort=name",
		"/customers/export.csv?sort=spend&dir=up",
	} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		if w.Code != http.StatusBadRequest || !strings.Contains(w.Body.String(), constants.InvalidQueryParam) {
			t.Errorf("%s: %d %s", path, w.Code, w.Body.String())
		}
	}
}
