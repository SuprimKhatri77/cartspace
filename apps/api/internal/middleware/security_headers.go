package middleware

import "github.com/gin-gonic/gin"

// APIContentSecurityPolicy fits JSON: nothing in a response may load or run,
// and no site may frame it. The docs page sets its own.
const APIContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'"

// SecurityHeaders hardens every response. hsts is for release mode, where
// the API is reached over https (Render terminates TLS in front of it).
func SecurityHeaders(hsts bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", APIContentSecurityPolicy)
		if hsts {
			h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		}
		c.Next()
	}
}
