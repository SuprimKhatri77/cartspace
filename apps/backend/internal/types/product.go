package types

import db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"

type CreateProduct struct {
	Name           string   `json:"name"            binding:"required,min=2,max=50"`
	Images         []string `json:"images"          binding:"required,min=1,max=5,dive,url"`
	ImagePublicIDs []string `json:"imagePublicIDs"  binding:"required,min=1,max=5,dive,url"`
	Description    string   `json:"description"     binding:"required"`
	Features       []string `json:"features"        binding:"omitempty,min=1,max=7,dive"`
	CategoryID     string   `json:"categoryID"      binding:"required,uuid"`
	IsActive       *bool    `json:"isActive"        binding:"required"`
	IsFeatured     *bool    `json:"isFeatured"      binding:"required"`
}
type UpdateProduct struct {
	Name           string   `json:"name"            binding:"required,min=2,max=50"`
	Images         []string `json:"images"          binding:"required,min=1,max=5,dive,url"`
	ImagePublicIDs []string `json:"imagePublicIDs"  binding:"required,min=1,max=5,dive,required"`
	Description    string   `json:"description"     binding:"required"`
	Features       []string `json:"features"        binding:"omitempty,min=1,max=7,dive"`
	CategoryID     string   `json:"categoryID"      binding:"required,uuid"`
	IsActive       *bool    `json:"isActive"        binding:"required"`
	IsFeatured     *bool    `json:"isFeatured"      binding:"required"`
}

type ListProductsByCategoryResponse struct {
	FilterOptions []db.GetCategoryFilterOptionsRow `json:"filterOptions"`
	Products      []db.ListProductsByCategoryRow   `json:"products"`
	PriceRange    db.GetMinMaxSellingPriceRow      `json:"priceRange"`
}

// handlers/product/user/get_product.go response sructure
type GetProductDetailResponse struct {
	ProductDetail   db.GetProductWithDefaultVariantBySlugRow `json:"productDetail"`
	Variants        []db.GetVariantsByProductSlugRow         `json:"variants"`
	RelatedProducts []db.GetRelatedProductsRow               `json:"relatedProducts"`
}
