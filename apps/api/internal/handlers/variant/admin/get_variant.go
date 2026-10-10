package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/rlog"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
)

func GetByVariantID(queries repository.VariantRepository) gin.HandlerFunc {
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

		variant, err := queries.GetVariantByID(ctx, variantID)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				rlog.Warn(c, "variant not found", "variantID", variantID)
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Variant not found",
					Code:    constants.VariantNotFound,
				})
				return
			}
			rlog.Error(c, "failed to get variant", err, "variantID", variantID)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Data:    variant,
		})
	}
}
