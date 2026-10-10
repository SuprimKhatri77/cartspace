package constants

// Error codes returned in the `code` field of failed responses. The OpenAPI
// spec's ErrorCode enum must list exactly these.
const (
	// general
	InternalServerError = "INTERNAL_SERVER_ERROR"
	ValidationFailed    = "VALIDATION_FAILED"
	InvalidPageParam    = "INVALID_PAGE_PARAMETER"
	InvalidPriceFilter  = "INVALID_PRICE_FILTER"
	InvalidQueryParam   = "INVALID_QUERY_PARAMETER"
	RouteNotFound       = "ROUTE_NOT_FOUND"
	MethodNotAllowed    = "METHOD_NOT_ALLOWED"

	// auth
	InvalidCredentials  = "INVALID_CREDENTIALS"
	MissingRefreshToken = "MISSING_REFRESH_TOKEN"
	InvalidRefreshToken = "INVALID_REFRESH_TOKEN"
	UserAlreadyExists   = "USER_ALREADY_EXISTS"
	Forbidden           = "FORBIDDEN"
	InvalidTokenClaims  = "INVALID_TOKEN_CLAIMS"
	UserNotFound        = "USER_NOT_FOUND"
	MissingAccessToken  = "MISSING_ACCESS_TOKEN"
	InvalidAccessToken  = "INVALID_ACCESS_TOKEN"

	// product
	ProductNotFound  = "PRODUCT_NOT_FOUND"
	InvalidProductID = "INVALID_PRODUCT_ID"

	// variant
	VariantNotFound      = "VARIANT_NOT_FOUND"
	InvalidVariantID     = "INVALID_VARIANT_ID"
	VariantAlreadyExists = "VARIANT_ALREADY_EXISTS"
	DefaultVariantExists = "DEFAULT_VARIANT_EXISTS"

	// category
	CategoryNotFound        = "CATEGORY_NOT_FOUND"
	InvalidCategoryID       = "INVALID_CATEGORY_ID"
	CategoryAlreadyExists   = "CATEGORY_ALREADY_EXISTS"
	SelfReferencingCategory = "SELF_REFERENCING_CATEGORY"
	CyclicCategoryReference = "CYCLIC_CATEGORY_REFERENCE"

	// cart
	VariantUnavailable = "VARIANT_UNAVAILABLE"
	InsufficientStock  = "INSUFFICIENT_STOCK"
	CartQuantityLimit  = "CART_QUANTITY_LIMIT"
	CartFull           = "CART_FULL"
	CartItemNotFound   = "CART_ITEM_NOT_FOUND"
)
