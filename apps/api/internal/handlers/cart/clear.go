package cart

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func ClearCartItems(queries repository.CartRepository) gin.HandlerFunc {
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

		rows, err := queries.ClearCart(ctx, db.ClearCartParams{
			CartID: cartID,
			UserID: userID,
		})
		if err != nil {
			httpx.Internal(c, "failed to clear cart", err, "cart_id", cartID)
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

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Cart cleared",
		})
	}
}
