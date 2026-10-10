package cart

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func UpdateQuantity(queries repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		userID, ok := httpx.UserID(c)
		if !ok {
			return
		}

		cartID, ok := httpx.PathUUID(c, "cartID", constants.InvalidCartID, "cart ID")
		if !ok {
			return
		}

		variantID, ok := httpx.PathUUID(c, "variantID", constants.InvalidVariantID, "variant ID")
		if !ok {
			return
		}

		req, ok := validator.BindJSON[types.UpdateItemQuantity](c)
		if !ok {
			return
		}
		variant, err := queries.GetVariantByID(ctx, variantID)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Variant not found",
					Code:    constants.VariantNotFound,
				})
				return
			}
			httpx.Internal(c, "failed to update cart item", err)
			return
		}

		if req.Quantity > int(variant.Stock) {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Not enough stock available",
				Code:    constants.InsufficientStock,
			})
			return
		}

		if req.Quantity == 0 {

			rows, err := queries.DeleteCartItem(ctx, db.DeleteCartItemParams{
				VariantID: variantID,
				CartID:    cartID,
				UserID:    userID,
			})

			if err != nil {

				httpx.Internal(c, "failed to update cart item", err)
				return
			}

			if rows == 0 {
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Cart item not found",
					Code:    constants.CartItemNotFound,
				})
				return
			}

		} else {

			_, err = queries.UpdateCartItemQuantity(ctx, db.UpdateCartItemQuantityParams{
				CartID:    cartID,
				VariantID: variantID,
				Quantity:  int32(req.Quantity),
				UserID:    userID,
			})

			if err != nil {

				var pgErr *pgconn.PgError
				if errors.As(err, &pgErr) && pgErr.Code == "23503" {
					if pgErr.ConstraintName == "cart_items_variant_id_fkey" {
						c.JSON(http.StatusNotFound, types.APIResponse{
							Success: false,
							Message: "Variant not found",
							Code:    constants.VariantNotFound,
						})
						return
					}
				}

				if errors.Is(err, pgx.ErrNoRows) {
					c.JSON(http.StatusNotFound, types.APIResponse{
						Success: false,
						Message: "Cart item not found",
						Code:    constants.CartItemNotFound,
					})
					return
				}
				httpx.Internal(c, "failed to update cart item", err)
				return
			}
		}

		message := "Cart item updated"
		if req.Quantity == 0 {
			message = "Cart item removed"
		}
		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: message,
		})

	}
}
