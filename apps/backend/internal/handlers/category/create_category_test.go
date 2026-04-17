package categoryHandler_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	categoryHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/category"
)

func TestCreateCategory_Success(t *testing.T) {
	repo := &mockCategoryRepo{
		createCategoryFn: func(_ context.Context, _ db.CreateCategoryParams) (db.Category, error) {
			return FakeCategory(), nil
		},

		categorySlugExistsFn: func(_ context.Context, slug string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/api/category", categoryHandler.CreateCategory(repo))
	})

	w := makeRequest(t, router, "POST", "/api/category", map[string]string{
		"name": "fake category",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestCreateCategory_ValidationFails(t *testing.T) {
	repo := &mockCategoryRepo{}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/api/category", categoryHandler.CreateCategory(repo))
	})

	w := makeRequest(t, router, "POST", "/api/category", map[string]string{
		"name":     "X",
		"parentID": "invalid_parent_id",
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCreateCategory_SlugExists(t *testing.T) {
	repo := &mockCategoryRepo{
		categorySlugExistsFn: func(_ context.Context, _ string) (bool, error) {
			return true, nil
		},

		createCategoryFn: func(_ context.Context, _ db.CreateCategoryParams) (db.Category, error) {
			return FakeCategory(), nil
		},
	}
	router := setupRouter(func(r *gin.Engine) {
		r.POST("/api/category", categoryHandler.CreateCategory(repo))
	})

	w := makeRequest(t, router, "POST", "/api/category", map[string]string{
		"name": "fake category",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestCreateCategory_DBError(t *testing.T) {
	repo := &mockCategoryRepo{
		createCategoryFn: func(_ context.Context, _ db.CreateCategoryParams) (db.Category, error) {
			return db.Category{}, fmt.Errorf("Failed to create category")
		},
		categorySlugExistsFn: func(_ context.Context, _ string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/api/category", categoryHandler.CreateCategory(repo))
	})

	w := makeRequest(t, router, "POST", "/api/category", map[string]string{
		"name": "fake category",
	})

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestCreateCategory_ParentNotFound(t *testing.T) {
	repo := &mockCategoryRepo{
		getCategoryByIdFn: func(_ context.Context, _ pgtype.UUID) (db.Category, error) {
			return db.Category{}, pgx.ErrNoRows
		},
		categorySlugExistsFn: func(_ context.Context, _ string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/api/category", categoryHandler.CreateCategory(repo))
	})

	_, str := getRandomUUID()
	w := makeRequest(t, router, "POST", "/api/category", map[string]string{
		"name":     "fake category",
		"parentID": str,
	})

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}

}

func TestCreateCategory_InvalidParentID(t *testing.T) {
	repo := &mockCategoryRepo{}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/api/category", categoryHandler.CreateCategory(repo))
	})

	w := makeRequest(t, router, "POST", "/api/category", map[string]string{
		"name":     "fake category",
		"parentID": "invalid_parent_id",
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCreateCategory_WithParentID(t *testing.T) {
	repo := &mockCategoryRepo{
		createSubCategoryFn: func(_ context.Context, _ db.CreateSubCategoryParams) (db.Category, error) {
			return FakeSubCategory(), nil
		},
		getCategoryByIdFn: func(_ context.Context, _ pgtype.UUID) (db.Category, error) {
			return FakeCategory(), nil
		},
		categorySlugExistsFn: func(_ context.Context, _ string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/api/category", categoryHandler.CreateCategory(repo))
	})

	_, str := getRandomUUID()
	w := makeRequest(t, router, "POST", "/api/category", map[string]string{
		"name":     "fake category",
		"parentID": str,
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
