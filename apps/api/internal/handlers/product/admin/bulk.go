package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

// uniqueIDs parses validated UUID strings, once each.
func uniqueIDs(raw []string) []pgtype.UUID {
	seen := make(map[[16]byte]bool, len(raw))
	ids := make([]pgtype.UUID, 0, len(raw))
	for _, s := range raw {
		id, err := utils.ConvertToUUID(s)
		if err != nil || seen[id.Bytes] {
			continue
		}
		seen[id.Bytes] = true
		ids = append(ids, id)
	}
	return ids
}

// BulkProducts hides, shows or deletes up to 100 products in one go. A
// delete is DeleteProduct's for each: variants, options and cart items go
// with them, past orders keep their copies, and their own images leave
// Cloudinary in the background unless an order still shows them.
func BulkProducts(queries *db.Queries, cld *cloudinary.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		req, ok := validator.BindJSON[types.BulkProducts](c)
		if !ok {
			return
		}
		ctx := c.Request.Context()
		ids := uniqueIDs(req.IDs)

		var (
			changed []pgtype.UUID
			err     error
			message string
		)
		switch req.Action {
		case "hide", "show":
			changed, err = queries.SetProductsActive(ctx, db.SetProductsActiveParams{IsActive: req.Action == "show", Ids: ids})
			if err != nil {
				httpx.Internal(c, "failed to update products", err)
				return
			}
			message = "Products hidden"
			if req.Action == "show" {
				message = "Products shown"
			}
		case "delete":
			rows, err := queries.ListProductsImages(ctx, ids)
			if err != nil {
				httpx.Internal(c, "failed to list product images", err)
				return
			}
			images := make([]db.ListProductImagesRow, len(rows))
			urls := make([]string, len(rows))
			for i, r := range rows {
				images[i] = db.ListProductImagesRow(r)
				urls[i] = r.Url
			}
			ordered, err := queries.OrderedImages(ctx, urls)
			if err != nil {
				httpx.Internal(c, "failed to check ordered images", err)
				return
			}
			changed, err = queries.DeleteProducts(ctx, ids)
			if err != nil {
				httpx.Internal(c, "failed to delete products", err)
				return
			}
			if publicIDs := deletableImages(cld, images, ordered); len(publicIDs) > 0 {
				go deleteImages(cld, publicIDs)
			}
			message = "Products deleted"
		}
		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: message,
			Data:    types.BulkResult{Affected: len(changed)},
		})
	}
}
