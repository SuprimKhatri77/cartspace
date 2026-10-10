package admin

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

// DeleteProduct deletes a product; its variants, options and cart items go
// with it (ON DELETE CASCADE), and past orders keep their copy. Its images
// on our Cloudinary cloud are then removed in the background.
func DeleteProduct(queries *db.Queries, cld *cloudinary.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := httpx.PathUUID(c, "productID", constants.InvalidProductID, "product ID")
		if !ok {
			return
		}
		ctx := c.Request.Context()

		images, err := queries.ListProductImages(ctx, productID)
		if err != nil {
			httpx.Internal(c, "failed to list product images", err, "product_id", productID)
			return
		}

		result, err := queries.DeleteProduct(ctx, productID)
		if err != nil {
			httpx.Internal(c, "failed to delete product", err, "product_id", productID)
			return
		}
		if result.RowsAffected() == 0 {
			httpx.Fail(c, http.StatusNotFound, constants.ProductNotFound, "Product not found")
			return
		}

		go deleteImages(cld, images)

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Product deleted",
		})
	}
}

// deleteImages removes images hosted on our cloud, best effort. Images
// elsewhere (the demo catalog's, on Cloudinary's demo cloud) are skipped:
// their public ids could name our own assets.
func deleteImages(cld *cloudinary.Client, images []db.ListProductImagesRow) {
	if cld == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	seen := map[string]bool{}
	for _, img := range images {
		publicID := img.PublicID
		if publicID == "" || seen[publicID] || !cld.Owns(img.Url) {
			continue
		}
		seen[publicID] = true
		if err := cld.DeleteImage(ctx, publicID); err != nil {
			slog.Warn("cloudinary: delete image", "public_id", publicID, "err", err)
		}
	}
}
