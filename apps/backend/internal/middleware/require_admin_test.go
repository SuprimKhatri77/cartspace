package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequireAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		role        string
		wantStatus  int
		wantHandler bool
	}{
		{"admin", http.StatusOK, true},
		{"customer", http.StatusForbidden, false},
		{"", http.StatusForbidden, false},
	}

	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			handlerRan := false

			r := gin.New()
			r.GET("/admin",
				func(c *gin.Context) { c.Set("role", tt.role) },
				RequireAdmin,
				func(c *gin.Context) {
					handlerRan = true
					c.Status(http.StatusOK)
				},
			)

			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/admin", nil))

			if w.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantStatus)
			}
			if handlerRan != tt.wantHandler {
				t.Fatalf("handler ran = %v, want %v", handlerRan, tt.wantHandler)
			}
		})
	}
}
