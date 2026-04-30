package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
)

type ProductRepository interface {
	CreateProduct(ctx context.Context, params db.CreateProductParams) (db.Product, error)
	ProductSlugExists(ctx context.Context, slug string) (bool, error)
	GetProductByID(ctx context.Context, id pgtype.UUID) (db.Product, error)
	UpdateProduct(ctx context.Context, params db.UpdateProductParams) (db.Product, error)
	DeleteProduct(ctx context.Context, id pgtype.UUID) (pgconn.CommandTag, error)
	ListActiveProducts(ctx context.Context, params db.ListActiveProductsParams) ([]db.ListActiveProductsRow, error)
	GetProductsCount(ctx context.Context) (int64, error)

	// for /admin/products route
	AdminProductsList(ctx context.Context, args db.AdminProductsListParams) ([]db.AdminProductsListRow, error)

	// for /category/:slug route
	GetCategoryFilterOptions(ctx context.Context, slug string) ([]db.GetCategoryFilterOptionsRow, error)
	ListProductsByCategory(ctx context.Context, params db.ListProductsByCategoryParams) ([]db.ListProductsByCategoryRow, error)
	ListProductsByCategoryPriceAsc(ctx context.Context, params db.ListProductsByCategoryPriceAscParams) ([]db.ListProductsByCategoryPriceAscRow, error)
	ListProductsByCategoryPriceDesc(ctx context.Context, params db.ListProductsByCategoryPriceDescParams) ([]db.ListProductsByCategoryPriceDescRow, error)
	GetMinMaxSellingPrice(ctx context.Context, slug string) (db.GetMinMaxSellingPriceRow, error)

	// for /products/:slug
	GetProductWithDefaultVariantBySlug(ctx context.Context, slug string) (db.GetProductWithDefaultVariantBySlugRow, error)
	GetVariantsByProductSlug(ctx context.Context, slug string) ([]db.GetVariantsByProductSlugRow, error)
	GetRelatedProducts(ctx context.Context, slug string) ([]db.GetRelatedProductsRow, error)
}
