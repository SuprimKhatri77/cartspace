package cart

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
)

func GetUserCart(queries repository.CartRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		userIDFromContext := c.MustGet(constants.UserIDKey).(string)

		userID, err := utils.ConvertToUUID(userIDFromContext)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid user ID format",
				Code:    constants.InvalidIDFormat,
			})
			return
		}

		userCart, err := queries.GetUserCart(ctx, userID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Data:    userCart,
		})
	}
}
