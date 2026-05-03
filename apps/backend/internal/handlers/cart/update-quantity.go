package cart

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func UpdateQuantity(queries repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		userIDFromContext := c.MustGet("userID").(string)
		userID, err := utils.ConvertToUUID(userIDFromContext)

		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid ID format",
				Code:    constants.InvalidIDFormat,
			})
			return
		}

		cartIDFromParam := c.Param("cartID")
		if cartIDFromParam == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing cart ID",
				Code:    constants.MissingCartID,
			})
			return
		}

		cartID, err := utils.ConvertToUUID(cartIDFromParam)

		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid cart ID format",
				Code:    constants.InvalidIDFormat,
			})
			return
		}
		variantIDFromParam := c.Param("variantID")
		if variantIDFromParam == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing variant ID",
				Code:    constants.MissingCartID,
			})
			return
		}

		variantID, err := utils.ConvertToUUID(variantIDFromParam)

		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid variant ID format",
				Code:    constants.InvalidIDFormat,
			})
			return
		}

		var req types.UpdateItemQuantity
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid request data",
				Code:    constants.ValidationFailed,
				Errors:  validator.Parse(err, req),
			})
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
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
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

				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to process request",
					Code:    constants.InternalServerError,
				})
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
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to process request",
					Code:    constants.InternalServerError,
				})
				return
			}
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
		})

	}
}
