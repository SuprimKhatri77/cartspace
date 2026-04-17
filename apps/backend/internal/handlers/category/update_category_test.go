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

func TestUpdateCategory_Success(t *testing.T) {
	repo := &mockCategoryRepo{
		updateCategoryFn: func(_ context.Context, _ db.UpdateCategoryParams) (db.Category, error) {
			return FakeCategory(), nil
		},

		getCategoryByIdFn: func(_ context.Context, _ pgtype.UUID) (db.Category, error) {
			return FakeCategory(), nil
		},
		categorySlugExistsFn: func(_ context.Context, _ string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))
	})

	_, str := getRandomUUID()
	w := makeRequest(t, router, "PUT", fmt.Sprintf("/api/category/%s", str), map[string]string{
		"name": "edit fake category",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestUpdateCategory_WithParentID(t *testing.T) {
	repo := &mockCategoryRepo{
		updateCategoryFn: func(_ context.Context, _ db.UpdateCategoryParams) (db.Category, error) {
			return FakeCategory(), nil
		},
		getCategoryByIdFn: func(_ context.Context, _ pgtype.UUID) (db.Category, error) {
			return FakeCategory(), nil
		},
		categorySlugExistsFn: func(_ context.Context, _ string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))
	})

	_, categoryID := getRandomUUID()
	_, parentID := getRandomUUID()
	w := makeRequest(t, router, "PUT", fmt.Sprintf("/api/category/%s", categoryID), map[string]string{
		"name":     "fake category",
		"parentID": parentID,
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestUpdateCategory_InvalidRequestBody(t *testing.T) {
	repo := &mockCategoryRepo{}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))

	})

	_, categoryID := getRandomUUID()
	w := makeRequest(t, router, "PUT", fmt.Sprintf("/api/category/%s", categoryID), map[string]string{
		"name": "",
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestUpdateCategory_UUIDConversionError(t *testing.T) {
	repo := &mockCategoryRepo{}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))
	})

	w := makeRequest(t, router, "PUT", "/api/category/invalid_uuid", map[string]string{
		"name": "fake category",
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestUpdateCategory_CategoryNotFound(t *testing.T) {
	repo := &mockCategoryRepo{

		getCategoryByIdFn: func(_ context.Context, _ pgtype.UUID) (db.Category, error) {
			return db.Category{}, pgx.ErrNoRows
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))
	})

	_, categoryID := getRandomUUID()
	w := makeRequest(t, router, "PUT", fmt.Sprintf("/api/category/%s", categoryID), map[string]string{
		"name": "new category name",
	})

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestUpdateCategory_DBError(t *testing.T) {
	repo := &mockCategoryRepo{
		updateCategoryFn: func(_ context.Context, _ db.UpdateCategoryParams) (db.Category, error) {
			return db.Category{}, fmt.Errorf("Failed to update category")
		},
		getCategoryByIdFn: func(_ context.Context, _ pgtype.UUID) (db.Category, error) {
			return FakeCategory(), nil
		},

		categorySlugExistsFn: func(ctx context.Context, slug string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))
	})

	_, categoryID := getRandomUUID()
	w := makeRequest(t, router, "PUT", fmt.Sprintf("/api/category/%s", categoryID), map[string]string{
		"name": "new category name",
	})

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestUpdateCategory_SelfReferencingParentID(t *testing.T) {
	catUUID, categoryID := getRandomUUID()
	repo := &mockCategoryRepo{

		getCategoryByIdFn: func(_ context.Context, _ pgtype.UUID) (db.Category, error) {
			return db.Category{ID: catUUID}, nil
		},

		categorySlugExistsFn: func(ctx context.Context, slug string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))
	})

	w := makeRequest(t, router, "PUT", fmt.Sprintf("/api/category/%s", categoryID), map[string]string{
		"name":     "new category name",
		"parentID": categoryID,
	})

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}

}

func TestUpdateCategory_ShallowCyclicReference(t *testing.T) {
	parentCatUUID, parentID := getRandomUUID()
	catUUID, categoryID := getRandomUUID()

	repo := &mockCategoryRepo{

		getCategoryByIdFn: func(ctx context.Context, id pgtype.UUID) (db.Category, error) {
			if id == catUUID {
				// first call — fetching the category being updated
				return db.Category{ID: catUUID}, nil
			}
			// second call — fetching the parent category
			// parent's ParentID points back to the category being updated = A -> B -> A
			return db.Category{ID: parentCatUUID, ParentID: catUUID}, nil
		},

		categorySlugExistsFn: func(ctx context.Context, slug string) (bool, error) {
			return false, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.PUT("/api/category/:id", categoryHandler.UpdateCategory(repo))
	})

	w := makeRequest(t, router, "PUT", fmt.Sprintf("/api/category/%s", categoryID), map[string]string{
		"name":     "new category name",
		"parentID": parentID,
	})

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}
