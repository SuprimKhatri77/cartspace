package types

// Passwords are never trimmed; bcrypt only uses the first 72 bytes, so max=72.
type RegisterRequest struct {
	Name     string `json:"name" label:"Name" binding:"required,not_blank,min=2,max=50,alphaspace" msg_alphaspace:"Name can only contain letters and spaces"`
	Email    string `json:"email" label:"Email" binding:"required,email,max=254" msg_email:"Enter a valid email address"`
	Password string `json:"password" label:"Password" trim:"-" binding:"required,min=8,max=72"`
}

type LoginRequest struct {
	Email    string `json:"email" label:"Email" binding:"required,email,max=254" msg_email:"Enter a valid email address"`
	Password string `json:"password" label:"Password" trim:"-" binding:"required,max=72"`
}
