package constants

const (
	// general
	InternalServerError = "INTERNAL_SERVER_ERROR"
	ValidationFailed    = "VALIDATION_FAILED"
	InvalidPageParam    = "INVALID_PAGE_PARAMETER"
	InvalidIDFormat     = "INVALID_ID_FORMAT"

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
	InvalidTokenClaims  = "INVALID_TOKEN_CLAIMS"
	UserNotFound        = "USER_NOT_FOUND"
	MissingAccessToken  = "MISSING_ACCESS_TOKEN"
	InvalidAccessToken  = "INVALID_ACCESS_TOKEN"
	Unauthorized        = "UNAUTHORIZED"

	// product
	ProductNotFound    = "PRODUCT_NOT_FOUND"
	MissingProductID   = "MISSING_PRODUCT_ID"
	InvalidProductID   = "INVALID_PRODUCT_ID"
	MissingProductSlug = "MISSING_PRODUCT_SLUG"

	// variant
	VariantNotFound      = "VARIANT_NOT_FOUND"
	MissingVariantID     = "MISSING_VARIANT_ID"
	InvalidVariantID     = "INVALID_VARIANT_ID"
	VariantAlreadyExists = "VARIANT_ALREADY_EXISTS"

	// category
	CategoryNotFound        = "CATEGORY_NOT_FOUND"
	MissingCategoryID       = "MISSING_CATEGORY_ID"
	InvalidCategoryID       = "INVALID_CATEGORY_ID"
	CategoryAlreadyExists   = "CATEGORY_ALREADY_EXISTS"
	SelfReferencingCategory = "SELF_REFERENCING_CATEGORY"
	CyclicCategoryReference = "CYCLIC_CATEGORY_REFERENCE"
	MissingCategorySlug     = "MISSING_CATEGORY_SLUG"

	// cart
	CartNotFound           = "CART_NOT_FOUND"
	CartAlreadyExists      = "CART_ALREADY_EXISTS"
	InvalidVariantQuantity = "INVALID_VARIANT_QUANTITY"
	MissingCartID          = "MISSING_CART_ID"
	InsufficientStock      = "INSUFFICIENT_STOCK"

	// cart item
	CartItemNotFound = "CART_ITEM_NOT_FOUND"
)
