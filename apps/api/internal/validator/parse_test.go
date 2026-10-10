package validator

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type parseTestBody struct {
	Name  string  `json:"name" label:"Name" binding:"required,not_blank" msg_required:"Name is required"`
	Price float64 `json:"selling_price" binding:"required,gt=0"`
	Tags  []int   `json:"tags"`
}

func bind(t *testing.T, body string) (int, []byte) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	Init()
	r := gin.New()
	r.POST("/", func(c *gin.Context) {
		if _, ok := BindJSON[parseTestBody](c); ok {
			c.Status(http.StatusOK)
		}
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body)))
	return w.Code, w.Body.Bytes()
}

func TestBindJSON(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		wantCode int
		contains []string
	}{
		{"valid", `{"name":"x","selling_price":1.5}`, http.StatusOK, nil},
		{"msg override", `{"selling_price":1}`, http.StatusBadRequest, []string{`"field":"name"`, `"Name is required"`, `"REQUIRED_FIELD"`}},
		{"whitespace-only is trimmed to empty, so required", `{"name":"   ","selling_price":1}`, http.StatusBadRequest, []string{`"REQUIRED_FIELD"`, `"Name is required"`}},
		{"humanized label", `{"name":"x","selling_price":-1}`, http.StatusBadRequest, []string{`"field":"selling_price"`, `"Selling price must be greater than 0"`}},
		{"type error", `{"name":"x","selling_price":"abc"}`, http.StatusBadRequest, []string{`"INVALID_TYPE"`, `"field":"selling_price"`, `"Selling price must be a number"`}},
		{"nested type error", `{"name":"x","selling_price":1,"tags":["a"]}`, http.StatusBadRequest, []string{`"INVALID_TYPE"`, `"field":"tags"`, `a whole number`}},
		{"malformed json", `{"name":`, http.StatusBadRequest, []string{`"INVALID_REQUEST"`}},
		{"empty body", ``, http.StatusBadRequest, []string{`"INVALID_REQUEST"`}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code, body := bind(t, tt.body)
			if code != tt.wantCode {
				t.Fatalf("code = %d, want %d, body %s", code, tt.wantCode, body)
			}
			for _, want := range tt.contains {
				if !bytes.Contains(body, []byte(want)) {
					t.Errorf("body %s missing %s", body, want)
				}
			}
		})
	}
}

type trimTestBody struct {
	Email    string `json:"email" binding:"required,email"`
	Code     string `json:"code" binding:"required,min=2"`
	Password string `json:"password" trim:"-" binding:"required"`
}

func TestBindJSONTrimsBeforeValidating(t *testing.T) {
	gin.SetMode(gin.TestMode)
	Init()

	run := func(body string) (*trimTestBody, int) {
		var got *trimTestBody
		r := gin.New()
		r.POST("/", func(c *gin.Context) {
			if b, ok := BindJSON[trimTestBody](c); ok {
				got = b
				c.Status(http.StatusOK)
			}
		})
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body)))
		return got, w.Code
	}

	got, code := run(`{"email":"  ada@example.com ","code":" ab ","password":" pw "}`)
	if code != http.StatusOK {
		t.Fatalf("padded but valid input rejected: %d", code)
	}
	if got.Email != "ada@example.com" || got.Code != "ab" {
		t.Fatalf("not trimmed: %+v", got)
	}
	if got.Password != " pw " {
		t.Fatalf("trim:\"-\" field was modified: %q", got.Password)
	}

	if _, code := run(`{"email":"a@b.co","code":" a ","password":"x"}`); code != http.StatusBadRequest {
		t.Fatalf("min=2 must apply to the trimmed value, got %d", code)
	}
}
