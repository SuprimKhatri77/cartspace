package cart

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func CreateCart(queries repository.CartRepository, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		userIDFromContext := c.MustGet("userID")

		userID, err := utils.ConvertToUUID(userIDFromContext.(string))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid ID format",
			})
			return
		}

		var req types.CreateCartRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid request data",
				Code:    constants.ValidationFailed,
				Errors:  validator.Parse(err, req),
			})
			return
		}

		utils.TrimStruct(&req)

		variantID, err := utils.ConvertToUUID(req.VariantID)

		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid variant ID format",
				Code:    constants.InvalidVariantID,
			})
			return
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		qtx := queries.WithTx(tx)

		cart, err := qtx.GetCartByUserID(ctx, userID)
		if err != nil {

			if errors.Is(err, pgx.ErrNoRows) {
				cart, err = qtx.CreateCart(ctx, userID)

				if err != nil {
					var pgErr *pgconn.PgError
					if errors.As(err, &pgErr) && pgErr.Code == "23503" {

						if pgErr.ConstraintName == "carts_user_id_unique" {

							c.JSON(http.StatusNotFound, types.APIResponse{
								Success: false,
								Message: "User not found",
								Code:    constants.UserNotFound,
							})
							return
						}
					}
					c.JSON(http.StatusInternalServerError, types.APIResponse{
						Success: false,
						Message: "Failed to process request",
						Code:    constants.InternalServerError,
					})
					return
				}

			} else {

				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to add item to cart",
					Code:    constants.InternalServerError,
				})
				return
			}
		}

		variant, err := qtx.GetVariantByID(ctx, variantID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Product variant not found",
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

		var unitPrice int32
		if variant.OfferPrice.Valid && variant.OfferExpiresAt.Valid && time.Now().Before(variant.OfferExpiresAt.Time) {
			unitPrice = variant.OfferPrice.Int32
		} else {
			unitPrice = variant.SellingPrice
		}

		cartItem, err := qtx.AddCartItem(ctx, db.AddCartItemParams{
			CartID:    cart.ID,
			VariantID: variantID,
			Quantity:  int32(req.Quantity),
			UnitPrice: unitPrice,
		})

		if err != nil {

			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23503" {
				switch pgErr.ConstraintName {
				case "cart_items_variant_id_fkey":
					c.JSON(http.StatusNotFound, types.APIResponse{
						Success: false,
						Message: "Variant not found",
						Code:    constants.VariantNotFound,
					})
				case "cart_items_cart_id_fkey":
					c.JSON(http.StatusNotFound, types.APIResponse{
						Success: false,
						Message: "Cart not found",
						Code:    constants.CartNotFound,
					})

				}
				return
			}

			if errors.As(err, &pgErr) && pgErr.Code == "23514" {
				c.JSON(http.StatusBadRequest, types.APIResponse{
					Success: false,
					Message: "Quantity must be > 0",
					Code:    constants.InvalidVariantQuantity,
				})
				return
			}

			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				if pgErr.ConstraintName == "cart_items_cart_variant_unique" {
					c.JSON(http.StatusConflict, types.APIResponse{
						Success: false,
						Message: "A cart already exists for the user",
						Code:    constants.CartAlreadyExists,
					})
					return
				}
			}

			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		if err := tx.Commit(ctx); err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusCreated, types.APIResponse{
			Success: true,
			Data:    cartItem,
		})

	}
}
