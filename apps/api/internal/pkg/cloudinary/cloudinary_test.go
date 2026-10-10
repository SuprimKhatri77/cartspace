package cloudinary

import (
	"crypto/sha1" //nolint:gosec // Cloudinary's default request signature is SHA-1
	"encoding/hex"
	"testing"
)

func TestSignUpload(t *testing.T) {
	c, err := New("cartspace", "key-123", "secret-xyz")
	if err != nil {
		t.Fatal(err)
	}
	got, err := c.SignUpload("cartspace/products", 1760000000)
	if err != nil {
		t.Fatal(err)
	}
	// Cloudinary: sha1 of the sorted "key=value&..." params, then the secret.
	sum := sha1.Sum([]byte("folder=cartspace/products&timestamp=1760000000secret-xyz")) //nolint:gosec
	if got.Signature != hex.EncodeToString(sum[:]) {
		t.Errorf("signature = %s, want %s", got.Signature, hex.EncodeToString(sum[:]))
	}
	if got.CloudName != "cartspace" || got.APIKey != "key-123" || got.Folder != "cartspace/products" || got.Timestamp != 1760000000 {
		t.Errorf("unexpected signature: %+v", got)
	}
}

func TestOwns(t *testing.T) {
	c, _ := New("cartspace", "k", "s")
	for url, want := range map[string]bool{
		"https://res.cloudinary.com/cartspace/image/upload/v1/cartspace/products/a.jpg": true,
		"https://res.cloudinary.com/demo/image/upload/samples/two-ladies.jpg":           false,
		"https://res.cloudinary.com/cartspace-evil/image/upload/a.jpg":                  false,
		"https://example.com/res.cloudinary.com/cartspace/a.jpg":                        false,
	} {
		if got := c.Owns(url); got != want {
			t.Errorf("Owns(%q) = %v, want %v", url, got, want)
		}
	}
}
