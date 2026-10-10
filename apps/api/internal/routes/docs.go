package routes

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

// setupDocsRoutes serves openapi.json and the Scalar UI under /api/v1,
// keeping /docs as a shortcut.
func setupDocsRoutes(r *gin.Engine, router *gin.RouterGroup, cfg config.Config) {
	docsPath := router.BasePath() + "/docs/"

	router.GET("/openapi.json", func(c *gin.Context) {
		data, err := os.ReadFile(cfg.Config.OpenAPIPath)
		if err != nil {
			c.JSON(http.StatusNotFound, types.APIResponse{
				Success: false,
				Message: "openapi spec not found, run bun run generate",
			})
			return
		}
		c.Data(http.StatusOK, "application/json", data)
	})

	html := strings.Replace(scalarHTML, `data-url="/openapi.json"`, `data-url="`+router.BasePath()+`/openapi.json"`, 1)
	router.GET("/docs/", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, html)
	})

	redirect := func(c *gin.Context) { c.Redirect(http.StatusMovedPermanently, docsPath) }
	router.GET("/docs", redirect)
	r.GET("/docs", redirect)
}

// scalarHTML is the Scalar API docs page that loads /openapi.json.
const scalarHTML = `<!DOCTYPE html>
<html>
<head>
  <title>API Docs</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="https://cdn.jsdelivr.net/npm/@scalar/api-reference/favicon.ico" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@scalar/api-reference/style.css" />
</head>
<body>
  <script id="api-reference" data-url="/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
`
