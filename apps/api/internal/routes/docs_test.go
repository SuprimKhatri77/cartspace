package routes

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	appconfig "github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/middleware"
	"github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
)

// The docs page loads Scalar, so it swaps the API's no-content policy for
// its own; every other response keeps it.
func TestDocsContentSecurityPolicy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.SecurityHeaders(false))
	Setup(r, config.Config{Config: &appconfig.Config{}})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/docs/", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("docs: status %d", w.Code)
	}
	csp := w.Header().Get("Content-Security-Policy")
	if csp != docsCSP {
		t.Errorf("docs CSP = %q, want docsCSP", csp)
	}
	if !strings.Contains(w.Body.String(), "cdn.jsdelivr.net") || !strings.Contains(csp, "https://cdn.jsdelivr.net") {
		t.Error("docs CSP must allow the CDN the page loads Scalar from")
	}

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))
	if got := w.Header().Get("Content-Security-Policy"); got != middleware.APIContentSecurityPolicy {
		t.Errorf("health CSP = %q", got)
	}
}
