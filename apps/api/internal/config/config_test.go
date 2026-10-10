package config

import (
	"strings"
	"testing"
)

func TestValidateAuth(t *testing.T) {
	a := strings.Repeat("a", 32)
	b := strings.Repeat("b", 32)

	tests := []struct {
		name            string
		access, refresh string
		wantErr         bool
	}{
		{"valid", a, b, false},
		{"empty access", "", b, true},
		{"empty refresh", a, "", true},
		{"short", a[:31], b, true},
		{"same secret", a, a, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := (&Config{JWTAccessSecret: tt.access, JWTRefreshSecret: tt.refresh}).ValidateAuth()
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
