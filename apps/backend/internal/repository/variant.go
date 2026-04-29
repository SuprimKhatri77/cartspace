package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
)

type VariantRepository interface {
	WithTx(tx pgx.Tx) VariantRepository
	CreateProductVariant(ctx context.Context, params db.CreateProductVariantParams) (db.ProductVariant, error)
	VariantSKUExists(ctx context.Context, sku pgtype.Text) (bool, error)
	GetProductByID(ctx context.Context, id pgtype.UUID) (db.Product, error)
	CreateProductOption(ctx context.Context, params db.CreateProductOptionParams) (db.ProductOption, error)
	CreateProductOptionValue(ctx context.Context, params db.CreateProductOptionValueParams) (db.ProductOptionValue, error)
	CreateVariantOptionValue(ctx context.Context, params db.CreateVariantOptionValueParams) error
	GetProductOptionByName(ctx context.Context, params db.GetProductOptionByNameParams) (db.ProductOption, error)
	GetOptionValueByValue(ctx context.Context, params db.GetOptionValueByValueParams) (db.ProductOptionValue, error)
	GetVariantByID(ctx context.Context, id pgtype.UUID) (db.ProductVariant, error)
	UpdateVariant(ctx context.Context, params db.UpdateVariantParams) (db.ProductVariant, error)
	DeleteVariantOptionValues(ctx context.Context, id pgtype.UUID) error
	DeleteVariant(ctx context.Context, id pgtype.UUID) (pgconn.CommandTag, error)
	UpdateVariantStock(ctx context.Context, params db.UpdateVariantStockParams) (db.ProductVariant, error)
	FetchExistingProductOptions(ctx context.Context, params db.FetchExistingProductOptionsParams) ([]db.ProductOption, error)
	FetchExistingProductOptionValues(ctx context.Context, params db.FetchExistingProductOptionValuesParams) ([]db.ProductOptionValue, error)
}

// concrete struct wrapping *db.Queries
type variantRepository struct {
	queries *db.Queries
}

// constructor — we need this in main.go instead of passing *db.Queries directly
func NewVariantRepository(queries *db.Queries) VariantRepository {
	return &variantRepository{queries: queries}
}

// WithTx returns a new variantRepository scoped to the transaction
func (r *variantRepository) WithTx(tx pgx.Tx) VariantRepository {
	return &variantRepository{queries: r.queries.WithTx(tx)}
}

// all other methods just delegate to the underlying *db.Queries
func (r *variantRepository) CreateProductVariant(ctx context.Context, params db.CreateProductVariantParams) (db.ProductVariant, error) {
	return r.queries.CreateProductVariant(ctx, params)
}

func (r *variantRepository) VariantSKUExists(ctx context.Context, sku pgtype.Text) (bool, error) {
	return r.queries.VariantSKUExists(ctx, sku)
}

func (r *variantRepository) GetProductByID(ctx context.Context, id pgtype.UUID) (db.Product, error) {
	return r.queries.GetProductByID(ctx, id)
}

func (r *variantRepository) CreateProductOption(ctx context.Context, params db.CreateProductOptionParams) (db.ProductOption, error) {
	return r.queries.CreateProductOption(ctx, params)
}

func (r *variantRepository) CreateProductOptionValue(ctx context.Context, params db.CreateProductOptionValueParams) (db.ProductOptionValue, error) {
	return r.queries.CreateProductOptionValue(ctx, params)
}

func (r *variantRepository) CreateVariantOptionValue(ctx context.Context, params db.CreateVariantOptionValueParams) error {
	return r.queries.CreateVariantOptionValue(ctx, params)
}

func (r *variantRepository) GetProductOptionByName(ctx context.Context, params db.GetProductOptionByNameParams) (db.ProductOption, error) {
	return r.queries.GetProductOptionByName(ctx, params)
}

func (r *variantRepository) GetOptionValueByValue(ctx context.Context, params db.GetOptionValueByValueParams) (db.ProductOptionValue, error) {
	return r.queries.GetOptionValueByValue(ctx, params)
}

func (r *variantRepository) GetVariantByID(ctx context.Context, id pgtype.UUID) (db.ProductVariant, error) {
	return r.queries.GetVariantByID(ctx, id)
}

func (r *variantRepository) UpdateVariant(ctx context.Context, params db.UpdateVariantParams) (db.ProductVariant, error) {
	return r.queries.UpdateVariant(ctx, params)
}

func (r *variantRepository) DeleteVariantOptionValues(ctx context.Context, id pgtype.UUID) error {
	return r.queries.DeleteVariantOptionValues(ctx, id)
}

func (r *variantRepository) DeleteVariant(ctx context.Context, id pgtype.UUID) (pgconn.CommandTag, error) {
	return r.queries.DeleteVariant(ctx, id)
}

func (r *variantRepository) UpdateVariantStock(ctx context.Context, params db.UpdateVariantStockParams) (db.ProductVariant, error) {
	return r.queries.UpdateVariantStock(ctx, params)
}

func (r *variantRepository) FetchExistingProductOptions(ctx context.Context, params db.FetchExistingProductOptionsParams) ([]db.ProductOption, error) {
	return r.queries.FetchExistingProductOptions(ctx, params)
}

func (r *variantRepository) FetchExistingProductOptionValues(ctx context.Context, params db.FetchExistingProductOptionValuesParams) ([]db.ProductOptionValue, error) {
	return r.queries.FetchExistingProductOptionValues(ctx, params)
}
