package types

type CreateCartRequest struct {
	VariantID string `json:"variantID" binding:"required,uuid"`
	Quantity  int    `json:"quantity" binding:"required,min=1,max=1"`
}

type UpdateItemQuantity struct {
	Quantity int `json:"quantity" binding:"min=0,max=50"`
}
