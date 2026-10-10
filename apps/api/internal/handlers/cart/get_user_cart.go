package cart

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func GetUserCart(queries repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		userID, ok := httpx.UserID(c)
		if !ok {
			return
		}

		userCart, err := queries.GetUserCart(ctx, userID)

		if err != nil {
			httpx.Internal(c, "failed to fetch cart", err)
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Cart fetched",
			Data:    userCart,
		})
	}
}
