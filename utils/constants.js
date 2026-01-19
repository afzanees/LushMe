// HTTP Status Codes Enum
const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Order Status Enum
const ORDER_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return Request',
  RETURNED: 'Returned'
};

// Payment Methods Enum
const PAYMENT_METHODS = {
  COD: 'cod',
  RAZORPAY: 'razorpay',
  WALLET: 'wallet'
};

// User Roles Enum
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

// Response Messages
const MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'Something went wrong',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  ALREADY_EXISTS: 'Resource already exists'
};

module.exports = {
  HTTP_STATUS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  USER_ROLES,
  MESSAGES
};
