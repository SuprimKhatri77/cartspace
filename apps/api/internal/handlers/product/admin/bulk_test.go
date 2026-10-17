package admin

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

// Bad input is refused before any query runs (no DB here).
func TestBulkProductsRefused(t *testing.T) {
	gin.SetMode(gin.TestMode)
	validator.Init()
	r := gin.New()
	r.POST("/bulk", BulkProducts(nil, nil))
	id := `"0f6ada99-b884-4c07-88d4-7843a41cdda8"`
	many := strings.TrimSuffix(strings.Repeat(id+",", 101), ",")
	for _, body := range []string{
		`{"action":"hide","ids":[]}`,
		`{"action":"hide"}`,
		`{"action":"archive","ids":[` + id + `]}`,
		`{"action":"delete","ids":["nope"]}`,
		`{"action":"show","ids":[` + many + `]}`,
	} {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/bulk", strings.NewReader(body))
		r.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest || !strings.Contains(w.Body.String(), constants.ValidationFailed) {
			t.Errorf("%s: %d %s", body, w.Code, w.Body.String())
		}
	}
}

func TestUniqueIDs(t *testing.T) {
	a, b := "0f6ada99-b884-4c07-88d4-7843a41cdda8", "1f6ada99-b884-4c07-88d4-7843a41cdda8"
	got := uniqueIDs([]string{a, b, strings.ToUpper(a), a})
	if len(got) != 2 {
		t.Errorf("got %d ids, want 2 (case-insensitive, once each)", len(got))
	}
}
