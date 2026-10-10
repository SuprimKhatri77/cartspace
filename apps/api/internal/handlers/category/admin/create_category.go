package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/rlog"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func CreateCategory(queries repository.CategoryRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		createCategoryRequest, ok := validator.BindJSON[types.CreateCategory](c)
		if !ok {
			return
		}

		slug := utils.Slugify(createCategoryRequest.Name)

		slugExists, err := queries.CategorySlugExists(ctx, slug)
		if err != nil {
			rlog.Error(c, "failed to query the db for slug check", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})

			return
		}

		if slugExists {
			slug, err = utils.SlugWithSuffix(slug)

			if err != nil {
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to generate unique slug",
					Code:    constants.InternalServerError,
				})
				return
			}

		}

		if createCategoryRequest.ParentID != "" {
			var parentID pgtype.UUID

			if err := parentID.Scan(createCategoryRequest.ParentID); err != nil {
				rlog.Warn(c, "invalid parent id", "error", err)
				c.JSON(http.StatusBadRequest, types.APIResponse{
					Success: false,
					Message: "Invalid parent category ID",
					Code:    constants.ValidationFailed,
				})
				return
			}

			_, err := queries.GetCategoryByID(ctx, parentID)

			if err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					rlog.Warn(c, "parent category not found", "parent_id", parentID)
					c.JSON(http.StatusNotFound, types.APIResponse{
						Success: false,
						Message: "Parent not found",
						Code:    constants.CategoryNotFound,
					})
					return
				}
				rlog.Error(c, "failed to fetch parent category", err, "parent_id", parentID)
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to process request",
					Code:    constants.InternalServerError,
				})
				return
			}

			category, err := queries.CreateSubCategory(ctx, db.CreateSubCategoryParams{
				Name:     createCategoryRequest.Name,
				ParentID: parentID,
				Slug:     slug,
			})
			if err != nil {
				var pgErr *pgconn.PgError
				if errors.As(err, &pgErr) && pgErr.Code == "23505" {
					c.JSON(http.StatusConflict, types.APIResponse{
						Success: false,
						Message: "Category already exists",
						Code:    constants.CategoryAlreadyExists,
					})
					return
				}
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Something went wrong",
					Code:    constants.InternalServerError,
				})
				return
			}

			c.JSON(http.StatusCreated, types.APIResponse{
				Success: true,
				Message: "Subcategory created",
				Data:    category,
			})

			return
		}

		category, err := queries.CreateCategory(ctx, db.CreateCategoryParams{
			Name: createCategoryRequest.Name,
			Slug: slug,
		})

		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				c.JSON(http.StatusConflict, types.APIResponse{
					Success: false,
					Message: "Category already exists",
					Code:    constants.CategoryAlreadyExists,
				})
				return
			}
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to create category",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusCreated, types.APIResponse{
			Success: true,
			Message: "Category created",
			Data:    category,
		})
	}
}
