# P2P Backend API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints are public and do not require authentication.

## Endpoints

### Users

#### Get All Users
```http
GET /users?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "uid": "google_uid_123",
        "email": "john@example.com",
        "isActive": true,
        "lastLogin": "2023-01-01T00:00:00.000Z",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### Create/Update User from Google Sign-In
```http
POST /users/google
```

**Request Body:**
```json
{
  "uid": "google_uid_123",
  "email": "john.doe@gmail.com",
  "displayName": "John Doe",
  "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocJ..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "uid": "google_uid_123",
      "email": "john@example.com",
      "displayName": "John Doe",
      "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocJ...",
      "isActive": true,
      "lastLogin": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### Logout User
```http
POST /users/logout
```

**Request Body:**
```json
{
  "uid": "google_uid_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User logged out successfully",
  "data": {
    "user": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "uid": "google_uid_123",
      "email": "john@example.com",
      "isActive": false,
      "lastLogin": "2023-01-01T00:00:00.000Z"
    }
  }
}
```


      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "uid": "google_uid_123",
      "email": "john.doe@gmail.com",
      "displayName": "John Doe",
      "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocJ...",
      "isActive": false,
      "lastLogin": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get User by UID
```http
GET /users/uid/google_uid_123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "uid": "google_uid_123",
      "email": "john@example.com",
      "isActive": true,
      "lastLogin": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get User by ID
```http
GET /users/60f7b3b3b3b3b3b3b3b3b3b3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "uid": "google_uid_123",
      "email": "john@example.com",
      "isActive": true,
      "lastLogin": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### Update User
```http
PUT /users/60f7b3b3b3b3b3b3b3b3b3b3
```

**Request Body:**
```json
{
  "email": "john.smith@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "uid": "google_uid_123",
      "email": "john.smith@example.com",
      "isActive": true,
      "lastLogin": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### Delete User
```http
DELETE /users/60f7b3b3b3b3b3b3b3b3b3b3
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### Search Users
```http
GET /users/search?q=john&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "uid": "google_uid_123",
        "email": "john@example.com",
        "isActive": true,
        "lastLogin": "2023-01-01T00:00:00.000Z",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```



### Users (Admin Only)

#### Get All Users
```http
GET /users?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "username": "johndoe",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "role": "user",
        "isActive": true,
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### Get User by ID
```http
GET /users/60f7b3b3b3b3b3b3b3b3b3b3
```

#### Search Users
```http
GET /users/search?q=john&page=1&limit=10
```

#### Update User
```http
PUT /users/60f7b3b3b3b3b3b3b3b3b3b3
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "role": "admin",
  "isActive": true
}
```

#### Delete User
```http
DELETE /users/60f7b3b3b3b3b3b3b3b3b3b3
```

### Health Check

#### Get API Health Status
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "data": {
    "status": "healthy",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "uptime": 123.456,
    "environment": "development",
    "database": {
      "status": "connected",
      "host": "localhost:27017"
    },
    "memory": {
      "used": 45,
      "total": 67
    },
    "version": "1.0.0"
  }
}
```

### Orders

#### Create Buy/Sell Order
```http
POST /orders
```

**Request Body:**
```json
{
  "uid": "CMj5c9ssZLPP8eoNfnA0GCp5n0g1",
  "type": "buy",
  "cryptocurrency": "USDT",
  "amount": 100.50,
  "price": 1.25,
  "paymentMethods": ["Bank Transfer", "Esewa", "Khalti"],
  "additionalInfo": "Please contact me for payment details"
}
```

**Response:**
```json
{
  "success": true,
  "message": "BUY order created successfully",
  "data": {
    "order": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "uid": "CMj5c9ssZLPP8eoNfnA0GCp5n0g1",
      "type": "buy",
      "cryptocurrency": "USDT",
      "amount": 100.50,
      "price": 1.25,
      "totalValue": 125.625,
      "paymentMethods": ["Bank Transfer", "Esewa", "Khalti"],
      "status": "pending",
      "additionalInfo": "Please contact me for payment details",
      "isActive": true,
      "orderSummary": "BUY 100.5 USDT at 1.25",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get All Orders
```http
GET /orders?type=buy&status=pending&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "uid": "CMj5c9ssZLPP8eoNfnA0GCp5n0g1",
        "type": "buy",
        "cryptocurrency": "USDT",
        "amount": 100.50,
        "price": 1.25,
        "totalValue": 125.625,
        "paymentMethods": ["Bank Transfer", "Esewa", "Khalti"],
        "status": "pending",
        "additionalInfo": "Please contact me for payment details",
        "isActive": true,
        "orderSummary": "BUY 100.5 USDT at 1.25",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### Get Order Statistics
```http
GET /orders/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 50,
    "buyOrders": 30,
    "sellOrders": 20,
    "pendingOrders": 15,
    "activeOrders": 25,
    "completedOrders": 10
  }
}
```

#### Get User Orders
```http
GET /orders/user/CMj5c9ssZLPP8eoNfnA0GCp5n0g1?type=buy&page=1&limit=10
```

#### Get Order by ID
```http
GET /orders/60f7b3b3b3b3b3b3b3b3b3b3
```

#### Update Order
```http
PUT /orders/60f7b3b3b3b3b3b3b3b3b3b3
```

**Request Body:**
```json
{
  "status": "active",
  "additionalInfo": "Payment received, processing order"
}
```

#### Delete Order
```http
DELETE /orders/60f7b3b3b3b3b3b3b3b3b3b3
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Validation Errors

When validation fails, the response includes detailed error information:

```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Please enter a valid email",
      "path": "email",
      "location": "body"
    }
  ]
}
```

## Rate Limiting

API endpoints are rate-limited to 100 requests per 15 minutes per IP address. When exceeded:

```json
{
  "error": "Too many requests from this IP, please try again later."
}
``` 