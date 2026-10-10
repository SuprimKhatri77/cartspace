package app

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/database"
)

func TestClientIPIgnoresForwardedForUnlessProxyTrusted(t *testing.T) {
	gin.SetMode(gin.TestMode)

	clientIP := func(t *testing.T, trusted []string) string {
		r, err := buildRouter(&config.Config{TrustedProxies: trusted}, nil, nil, &database.DB{})
		if err != nil {
			t.Fatal(err)
		}
		r.GET("/ip", func(c *gin.Context) { c.String(http.StatusOK, c.ClientIP()) })
		req := httptest.NewRequest(http.MethodGet, "/ip", nil)
		req.RemoteAddr = "10.0.0.5:1234"
		req.Header.Set("X-Forwarded-For", "6.6.6.6")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w.Body.String()
	}

	if got := clientIP(t, nil); got != "10.0.0.5" {
		t.Fatalf("no trusted proxies: ClientIP = %q, want the socket address", got)
	}
	if got := clientIP(t, []string{"10.0.0.0/8"}); got != "6.6.6.6" {
		t.Fatalf("trusted proxy: ClientIP = %q, want the forwarded address", got)
	}
	if _, err := buildRouter(&config.Config{TrustedProxies: []string{"not-an-ip"}}, nil, nil, &database.DB{}); err == nil {
		t.Fatal("invalid TRUSTED_PROXIES must fail startup")
	}
}
