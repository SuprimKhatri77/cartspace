package routes

import (
	"testing"

	"github.com/gin-gonic/gin"

	appconfig "github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
)

func TestSetupRegistersAllRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	Setup(r, config.Config{Config: &appconfig.Config{}})

	want := []string{
		"GET /",
		"GET /docs",
		"GET /api/v1/health",
		"GET /api/v1/openapi.json",
		"GET /api/v1/docs",
		"GET /api/v1/docs/",

		"POST /api/v1/auth/register",
		"POST /api/v1/auth/login",
		"POST /api/v1/auth/logout",
		"POST /api/v1/auth/refresh",
		"GET /api/v1/auth/me",

		"POST /api/v1/admin/categories",
		"PUT /api/v1/admin/categories/:id",
		"DELETE /api/v1/admin/categories/:id",
		"GET /api/v1/admin/categories",
		"GET /api/v1/categories/:slug",

		"POST /api/v1/admin/products",
		"PUT /api/v1/admin/products/:productID",
		"DELETE /api/v1/admin/products/:productID",
		"GET /api/v1/admin/products",
		"GET /api/v1/admin/products/:productID",
		"GET /api/v1/products",
		"GET /api/v1/products/:productSlug",

		"POST /api/v1/admin/products/:productID/variants",
		"PUT /api/v1/admin/products/:productID/variants/:variantID",
		"DELETE /api/v1/admin/products/:productID/variants/:variantID",
		"GET /api/v1/admin/products/:productID/variants/:variantID",

		"GET /api/v1/carts",
		"POST /api/v1/carts",
		"DELETE /api/v1/carts/:cartID",
		"PATCH /api/v1/carts/:cartID/:variantID",
	}

	got := map[string]bool{}
	for _, route := range r.Routes() {
		got[route.Method+" "+route.Path] = true
	}
	for _, w := range want {
		if !got[w] {
			t.Errorf("missing route %s", w)
		}
	}
	if len(got) != len(want) {
		t.Errorf("registered %d routes, want %d", len(got), len(want))
	}
}
