package admin

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func UpdateProduct(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		productIDFromParams := c.Param("productID")

		if productIDFromParams == "" {
			slog.Debug("Missing product ID")

			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing product ID",
			})
			return
		}

		var productID pgtype.UUID
		if err := productID.Scan(productIDFromParams); err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid product ID format",
			})
			return
		}

		var updateProductRequest types.UpdateProduct

		if err := c.ShouldBindJSON(&updateProductRequest); err != nil {
			slog.Error("Invalid request body", "error", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid data",
				Errors:  validator.Parse(err, updateProductRequest),
			})
			return
		}

		utils.TrimStruct(&updateProductRequest)

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
				Message: "Failed to process request",
			})
			return
		}

		newSlug := utils.Slugify(updateProductRequest.Name)
		if newSlug != product.Slug {
			newSlug = utils.Slugify(updateProductRequest.Name)

			slugExists, err := queries.ProductSlugExists(ctx, newSlug)
			if err != nil {
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to process request",
				})
				return
			}

			if slugExists {
				newSlug, err = utils.SlugWithSuffix(newSlug)
				if err != nil {
					c.JSON(http.StatusInternalServerError, types.APIResponse{
						Success: false,
						Message: "Failed to generate slug",
					})
					return
				}
			}

		}

		categoryID, err := utils.ConvertToUUID(updateProductRequest.CategoryID)
		if err != nil {
			slog.Error("failed to parse the category ID", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
			})
			return
		}

		description := pgtype.Text{String: updateProductRequest.Description, Valid: true}

		updatedProduct, err := queries.UpdateProduct(ctx, db.UpdateProductParams{
			ID:             productID,
			Name:           updateProductRequest.Name,
			Features:       updateProductRequest.Features,
			Images:         updateProductRequest.Images,
			ImagePublicIds: updateProductRequest.ImagePublicIDs,
			IsActive:       *updateProductRequest.IsActive,
			IsFeatured:     *updateProductRequest.IsFeatured,
			Description:    description,
			CategoryID:     categoryID,
			Slug:           newSlug,
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to update the product",
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Product updated",
			Data:    updatedProduct,
		})

	}
}
