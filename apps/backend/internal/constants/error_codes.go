package constants

const (
	// general
	InternalServerError = "INTERNAL_SERVER_ERROR"
	ValidationFailed    = "VALIDATION_FAILED"

	// auth
	InvalidCredentials  = "INVALID_CREDENTIALS"
	MissingRefreshToken = "MISSING_REFRESH_TOKEN"
	InvalidRefreshToken = "INVALID_REFRESH_TOKEN"
	UserAlreadyExists   = "USER_ALREADY_EXISTS"
	RefreshTokenExpired = "REFRESH_TOKEN_EXPIRED"
	InvalidToken        = "INVALID_TOKEN"
	Forbidden           = "FORBIDDEN"
	MissingAuthToken    = "MISSING_AUTH_TOKEN"
	InvalidAuthHeader   = "INVALID_AUTH_HEADER"

	// product
	ProductNotFound  = "PRODUCT_NOT_FOUND"
	MissingProductID = "MISSING_PRODUCT_ID"
	InvalidProductID = "INVALID_PRODUCT_ID"
	InvalidPageParam = "INVALID_PAGE_PARAMETER"

	// category
	CategoryNotFound        = "CATEGORY_NOT_FOUND"
	MissingCategoryID       = "MISSING_CATEGORY_ID"
	InvalidCategoryID       = "INVALID_CATEGORY_ID"
	CategoryAlreadyExists   = "CATEGORY_ALREADY_EXISTS"
	SelfReferencingCategory = "SELF_REFERENCING_CATEGORY"
	CyclicCategoryReference = "CYCLIC_CATEGORY_REFERENCE"
)
