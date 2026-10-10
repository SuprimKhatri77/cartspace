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

func TestSplitList(t *testing.T) {
	got := splitList(" 10.0.0.0/8, ,172.16.0.1 ,")
	if len(got) != 2 || got[0] != "10.0.0.0/8" || got[1] != "172.16.0.1" {
		t.Fatalf("got %q", got)
	}
	if splitList("") != nil {
		t.Fatal("empty value must give no proxies")
	}
}
