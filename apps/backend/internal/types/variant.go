package types

type VariantProperty struct {
	Name  string `json:"name" binding:"required,min=2,max=20"`
	Value string `json:"value" binding:"required,min=1,max=20"`
	Type  string `json:"type" binding:"required,oneof=text color"`
}

type CreateProductVariant struct {
	ProductID      string            `json:"productID" binding:"required,uuid"`
	Images         []string          `json:"images" binding:"required,min=1,max=5,dive,url"`
	ImagePublicIDs []string          `json:"imagePublicIDs" binding:"required,min=1,max=5,dive,required"`
	Stock          int               `json:"stock" binding:"required,min=1,max=10000"`
	SellingPrice   float64           `json:"sellingPrice" binding:"required,gt=0,max=1000000"`
	OfferPrice     float64           `json:"offerPrice,omitempty" binding:"omitempty,gt=0,max=1000000"`
	IsDefault      *bool             `json:"isDefault" binding:"required"`
	IsActive       *bool             `json:"isActive" binding:"required"`
	Properties     []VariantProperty `json:"properties,omitempty" binding:"omitempty,dive,required"`
}

type UpdateProductVariant struct {
	Images         []string `json:"images" binding:"required,min=1,max=5,dive,url"`
	ImagePublicIDs []string `json:"imagePublicIDs" binding:"required,min=1,max=5,dive,required"`
	Stock          int      `json:"stock" binding:"required,min=1,max=10000"`
	SellingPrice   float64  `json:"sellingPrice" binding:"required,gt=0,max=1000000"`
	OfferPrice     float64  `json:"offerPrice,omitempty" binding:"omitempty,gt=0,max=1000000"`
	IsDefault      *bool    `json:"isDefault" binding:"required"`
	IsActive       *bool    `json:"isActive" binding:"required"`
}

type UpdateStock struct {
	Stock int `json:"stock" binding:"required,min=0,max=10000"`
}
