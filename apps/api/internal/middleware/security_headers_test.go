package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, hsts := range []bool{false, true} {
		r := gin.New()
		r.Use(SecurityHeaders(hsts))
		r.GET("/x", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{}) })
		r.NoRoute(func(c *gin.Context) { c.JSON(http.StatusNotFound, gin.H{}) })

		for _, path := range []string{"/x", "/missing"} {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
			want := map[string]string{
				"X-Content-Type-Options":  "nosniff",
				"X-Frame-Options":         "DENY",
				"Referrer-Policy":         "no-referrer",
				"Content-Security-Policy": APIContentSecurityPolicy,
			}
			for k, v := range want {
				if got := w.Header().Get(k); got != v {
					t.Errorf("hsts=%v %s: %s = %q, want %q", hsts, path, k, got, v)
				}
			}
			if got := w.Header().Get("Strict-Transport-Security"); (got != "") != hsts {
				t.Errorf("hsts=%v %s: Strict-Transport-Security = %q", hsts, path, got)
			}
		}
	}
}
