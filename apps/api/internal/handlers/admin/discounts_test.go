package admin

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

// Bad input is refused before any query runs (the handlers get no DB).
func TestDiscountInputRefused(t *testing.T) {
	gin.SetMode(gin.TestMode)
	validator.Init()
	r := gin.New()
	r.GET("/discounts", ListDiscounts(nil))
	r.POST("/discounts", CreateDiscount(nil))
	r.PUT("/discounts/:id", UpdateDiscount(nil))
	r.DELETE("/discounts/:id", DeleteDiscount(nil))

	valid := `"kind":"percent","value":10,"min_subtotal":0,"is_active":true`
	for _, tt := range []struct{ method, path, body, code, field string }{
		{"GET", "/discounts?state=open", "", constants.InvalidQueryParam, ""},
		{"GET", "/discounts?q=" + strings.Repeat("a", 33), "", constants.InvalidQueryParam, ""},
		{"GET", "/discounts?page=0", "", constants.InvalidPageParam, ""},
		{"PUT", "/discounts/nope", `{}`, constants.InvalidDiscountID, ""},
		{"DELETE", "/discounts/nope", "", constants.InvalidDiscountID, ""},
		{"POST", "/discounts", `{"code":"ab",` + valid + `}`, constants.ValidationFailed, "code"},
		{"POST", "/discounts", `{"code":"-SALE",` + valid + `}`, constants.ValidationFailed, "code"},
		{"POST", "/discounts", `{"code":"SUMMER SALE",` + valid + `}`, constants.ValidationFailed, "code"},
		{"POST", "/discounts", `{"code":"SALE","kind":"bogo","value":10,"is_active":true}`, constants.ValidationFailed, "kind"},
		{"POST", "/discounts", `{"code":"SALE","kind":"fixed","value":0,"is_active":true}`, constants.ValidationFailed, "value"},
		{"POST", "/discounts", `{"code":"SALE","kind":"percent","value":150,"is_active":true}`, constants.ValidationFailed, "value"},
		{"POST", "/discounts", `{"code":"SALE","kind":"fixed","value":500}`, constants.ValidationFailed, "is_active"},
		{"POST", "/discounts", `{"code":"SALE",` + valid + `,"max_redemptions":0}`, constants.ValidationFailed, ""},
		{"POST", "/discounts", `{"code":"SALE",` + valid + `,"min_subtotal":-1}`, constants.ValidationFailed, "min_subtotal"},
		{"POST", "/discounts", `{"code":"SALE",` + valid + `,"starts_at":"2026-11-02T00:00:00Z","ends_at":"2026-11-01T00:00:00Z"}`,
			constants.ValidationFailed, "ends_at"},
	} {
		w := httptest.NewRecorder()
		var body *strings.Reader
		if tt.body != "" {
			body = strings.NewReader(tt.body)
		}
		req := httptest.NewRequest(tt.method, tt.path, nil)
		if body != nil {
			req = httptest.NewRequest(tt.method, tt.path, body)
			req.Header.Set("Content-Type", "application/json")
		}
		r.ServeHTTP(w, req)
		got := w.Body.String()
		if w.Code != http.StatusBadRequest || !strings.Contains(got, tt.code) ||
			(tt.field != "" && !strings.Contains(got, `"field":"`+tt.field+`"`)) {
			t.Errorf("%s %s %s: %d %s, want 400 %s on %q", tt.method, tt.path, tt.body, w.Code, got, tt.code, tt.field)
		}
	}
}

func TestDiscountProblems(t *testing.T) {
	start := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	for _, tt := range []struct {
		name string
		in   types.DiscountCodeInput
		want []string
	}{
		{"percent at the limit", types.DiscountCodeInput{Kind: "percent", Value: 100}, nil},
		{"percent over", types.DiscountCodeInput{Kind: "percent", Value: 101}, []string{"value"}},
		{"a big fixed amount is fine", types.DiscountCodeInput{Kind: "fixed", Value: 50_000}, nil},
		{"window in order", types.DiscountCodeInput{Kind: "fixed", Value: 1, StartsAt: &start, EndsAt: &end}, nil},
		{"ends when it starts", types.DiscountCodeInput{Kind: "fixed", Value: 1, StartsAt: &start, EndsAt: &start}, []string{"ends_at"}},
		{"open start", types.DiscountCodeInput{Kind: "fixed", Value: 1, EndsAt: &end}, nil},
		{"both wrong", types.DiscountCodeInput{Kind: "percent", Value: 500, StartsAt: &end, EndsAt: &start}, []string{"value", "ends_at"}},
	} {
		var got []string
		for _, e := range discountProblems(&tt.in) {
			got = append(got, e.Field)
		}
		if strings.Join(got, ",") != strings.Join(tt.want, ",") {
			t.Errorf("%s: fields %v, want %v", tt.name, got, tt.want)
		}
	}
}
