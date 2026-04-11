package types

type AppError struct {
	Code    string `json:"code"`
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

type APIResponse struct {
	Success bool       `json:"success"`
	Message string     `json:"message,omitempty"`
	Errors  []AppError `json:"errors,omitempty"`
}
