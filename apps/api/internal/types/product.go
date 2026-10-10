package types

import db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"

type CreateProduct struct {
	Name           string   `json:"name"            binding:"required,min=2,max=50"`
	Images         []string `json:"images"          binding:"required,min=1,max=5,dive,url"`
	ImagePublicIDs []string `json:"image_public_ids"  binding:"required,min=1,max=5,dive,required"`
	Description    string   `json:"description"     binding:"required"`
	Features       []string `json:"features"        binding:"omitempty,min=1,max=7,dive"`
	CategoryID     string   `json:"category_id"      binding:"required,uuid"`
	IsActive       *bool    `json:"is_active"        binding:"required"`
	IsFeatured     *bool    `json:"is_featured"      binding:"required"`
}
type UpdateProduct struct {
	Name           string   `json:"name"            binding:"required,min=2,max=50"`
	Images         []string `json:"images"          binding:"required,min=1,max=5,dive,url"`
	ImagePublicIDs []string `json:"image_public_ids"  binding:"required,min=1,max=5,dive,required"`
	Description    string   `json:"description"     binding:"required"`
	Features       []string `json:"features"        binding:"omitempty,min=1,max=7,dive"`
	CategoryID     string   `json:"category_id"      binding:"required,uuid"`
	IsActive       *bool    `json:"is_active"        binding:"required"`
	IsFeatured     *bool    `json:"is_featured"      binding:"required"`
}

type ListProductsByCategoryResponse struct {
	FilterOptions []db.GetCategoryFilterOptionsRow `json:"filter_options"`
	Products      []db.ListProductsByCategoryRow   `json:"products"`
	PriceRange    db.GetMinMaxSellingPriceRow      `json:"price_range"`
}

// handlers/product/user/get_product.go response sructure
type GetProductDetailResponse struct {
	ProductDetail   db.GetProductWithDefaultVariantBySlugRow `json:"product_detail"`
	Variants        []db.GetVariantsByProductSlugRow         `json:"variants"`
	RelatedProducts []db.GetRelatedProductsRow               `json:"related_products"`
}
