package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
)

func DeleteVariant(queries repository.VariantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		variantIDFromParams := c.Param("variantID")
		if variantIDFromParams == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing variant ID",
				Code:    constants.MissingVariantID,
			})
			return
		}

		variantID, err := utils.ConvertToUUID(variantIDFromParams)
		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid variant ID",
				Code:    constants.InvalidVariantID,
			})
			return
		}

		result, err := queries.DeleteVariant(ctx, variantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to delete variant",
				Code:    constants.InternalServerError,
			})
			return
		}

		if result.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, types.APIResponse{
				Success: false,
				Message: "Variant not found",
				Code:    constants.VariantNotFound,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Variant deleted",
		})
	}
}
