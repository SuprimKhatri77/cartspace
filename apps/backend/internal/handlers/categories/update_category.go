package categoryHandler

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func UpdateCategory(queries repository.CategoryRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var updateCategoryRequest types.UpdateCategory

		if err := c.ShouldBindJSON(&updateCategoryRequest); err != nil {
			slog.Error("invalid request body", "error", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid request data",
				Errors:  validator.Parse(err, updateCategoryRequest),
			})

			return
		}

		utils.TrimStruct(&updateCategoryRequest)

		categoryID, err := utils.ConvertToUUID(c.Param("id"))
		if err != nil {
			slog.Error("error converting the id to UUID", "error", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid category ID format",
			})
			return
		}

		category, err := queries.GetCategoryByID(ctx, categoryID)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Category not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
			})
			return
		}
		var slug string

		if updateCategoryRequest.Name != category.Name {
			slug = utils.Slugify(updateCategoryRequest.Name)

			slugExists, err := queries.CategorySlugExists(ctx, slug)
			if err != nil {

				slog.Error("failed to get category", "error", err)
				c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Something went wrong"})

				return
			}

			if slugExists {
				slug, err = utils.SlugWithSuffix(slug)
				if err != nil {
					c.JSON(http.StatusInternalServerError, types.APIResponse{
						Success: false,
						Message: "Failed to generate slug",
					})
					return
				}
			}
		} else {
			slug = category.Slug
		}

		parentID := category.ParentID

		var categoryParentIDString string
		if category.ParentID.Valid {
			val, _ := category.ParentID.Value()
			categoryParentIDString = fmt.Sprintf("%v", val)
		}

		if updateCategoryRequest.ParentID != "" && updateCategoryRequest.ParentID != categoryParentIDString {
			parentID, err = utils.ConvertToUUID(updateCategoryRequest.ParentID)
			if err != nil {
				c.JSON(http.StatusBadRequest, types.APIResponse{
					Success: false,
					Message: "Invalid parent category ID format",
				})
				return
			}

			parentCategory, err := queries.GetCategoryByID(ctx, parentID)
			if err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					c.JSON(http.StatusNotFound, types.APIResponse{
						Success: false,
						Message: "Parent category not found",
					})
				} else {
					c.JSON(http.StatusInternalServerError, types.APIResponse{
						Success: false,
						Message: "Something went wrong",
					})
				}
				return
			}

			// self referencing check A -> A
			if parentID == categoryID {
				c.JSON(http.StatusConflict, types.APIResponse{
					Success: false,
					Message: "A category cannot be its own parent",
				})
				return
			}

			// TODO: recursive cycle detection

			// shallow cyclic reference check A -> B -> A
			if parentCategory.ParentID == category.ID {
				c.JSON(http.StatusConflict, types.APIResponse{
					Success: false,
					Message: "Assigning this parent would create a circular reference",
				})
				return
			}

		}

		updatedCategory, err := queries.UpdateCategory(ctx, db.UpdateCategoryParams{
			Name:     updateCategoryRequest.Name,
			Slug:     slug,
			ID:       categoryID,
			ParentID: parentID,
		})
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23514" {
				c.JSON(http.StatusConflict, types.APIResponse{
					Success: false,
					Message: "A category cannot be its own parent",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to update category",
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Category updated",
			Data:    updatedCategory,
		})

	}
}
