package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
)

type CartRepository interface {
	WithTx(tx pgx.Tx) CartRepository
	CreateCart(ctx context.Context, userID pgtype.UUID) (db.Cart, error)
	AddCartItem(ctx context.Context, params db.AddCartItemParams) (db.CartItem, error)
	GetCartByUserID(ctx context.Context, userID pgtype.UUID) (db.Cart, error)
	GetVariantByID(ctx context.Context, id pgtype.UUID) (db.ProductVariant, error)
	ClearCart(ctx context.Context, params db.ClearCartParams) (int64, error)
	UpdateCartItemQuantity(ctx context.Context, params db.UpdateCartItemQuantityParams) (db.CartItem, error)
	DeleteCartItem(ctx context.Context, params db.DeleteCartItemParams) (int64, error)
	GetUserCart(ctx context.Context, userID pgtype.UUID) ([]db.GetUserCartRow, error)
}

type cartRepository struct {
	queries *db.Queries
}

func NewCartRepository(queries *db.Queries) CartRepository {
	return &cartRepository{queries: queries}
}

func (c *cartRepository) WithTx(tx pgx.Tx) CartRepository {
	return &cartRepository{queries: c.queries.WithTx(tx)}
}

func (c *cartRepository) CreateCart(ctx context.Context, userID pgtype.UUID) (db.Cart, error) {
	return c.queries.CreateCart(ctx, userID)
}
func (c *cartRepository) AddCartItem(ctx context.Context, params db.AddCartItemParams) (db.CartItem, error) {
	return c.queries.AddCartItem(ctx, params)
}
func (c *cartRepository) GetCartByUserID(ctx context.Context, id pgtype.UUID) (db.Cart, error) {
	return c.queries.GetCartByUserID(ctx, id)
}
func (c *cartRepository) GetVariantByID(ctx context.Context, id pgtype.UUID) (db.ProductVariant, error) {
	return c.queries.GetVariantByID(ctx, id)
}

func (c *cartRepository) ClearCart(ctx context.Context, params db.ClearCartParams) (int64, error) {
	return c.queries.ClearCart(ctx, params)
}

func (c *cartRepository) UpdateCartItemQuantity(ctx context.Context, params db.UpdateCartItemQuantityParams) (db.CartItem, error) {
	return c.queries.UpdateCartItemQuantity(ctx, params)
}

func (c *cartRepository) DeleteCartItem(ctx context.Context, params db.DeleteCartItemParams) (int64, error) {
	return c.queries.DeleteCartItem(ctx, params)
}

func (c *cartRepository) GetUserCart(ctx context.Context, userID pgtype.UUID) ([]db.GetUserCartRow, error) {
	return c.queries.GetUserCart(ctx, userID)
}
