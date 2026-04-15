package types

type CreateCategory struct {
	Name     string `json:"name" binding:"required,min=2,max=20"`
	ParentID string `json:"parentID,omitempty" binding:"omitempty,uuid"`
}

type UpdateCategory struct {
	Name     string `json:"name" binding:"required,min=2,max=20"`
	ParentID string `json:"parentID,omitempty" binding:"omitempty,uuid"`
}
