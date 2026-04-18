package admin

import (
	"errors"
	"log"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func CreateCategory(queries repository.CategoryRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var createCategoryRequest types.CreateCategory

		if err := c.ShouldBindJSON(&createCategoryRequest); err != nil {
			slog.Error("validation failed", "error", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid request data",
				Errors:  validator.Parse(err, createCategoryRequest),
				Code:    constants.ValidationFailed,
			})
			return
		}

		utils.TrimStruct(&createCategoryRequest)
		slug := utils.Slugify(createCategoryRequest.Name)

		slugExists, err := queries.CategorySlugExists(ctx, slug)
		if err != nil {
			slog.Error("failed to query the db for slug check", "error", err)
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
				slog.Error("invalid parent id", "error", err)
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
					log.Println("no rows found err will be triggered")
					c.JSON(http.StatusNotFound, types.APIResponse{
						Success: false,
						Message: "Parent not found",
						Code:    constants.CategoryNotFound,
					})
					return
				}
				log.Println("is this the error that is being triggered")
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

			c.JSON(http.StatusOK, types.APIResponse{
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
