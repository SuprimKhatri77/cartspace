package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
)

// used to fetch a particular product
func GetProductByID(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		productIDFromParams := c.Param("productID")
		if productIDFromParams == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing product ID",
			})
			return
		}

		productID, err := utils.ConvertToUUID(productIDFromParams)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid product ID format",
			})
			return
		}

		product, err := queries.GetProductByID(ctx, productID)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Product not found",
				})
				return
			}

			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to fetch the product",
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Product fetched",
			Data:    product,
		})
	}
}
