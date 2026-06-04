# Django Backend Integration Guide

This document explains how to connect your Django backend to the ReviewAI frontend.

## Expected API Structure

The frontend expects your Django backend to have the following URL structure:

```
Base URL: /api/
```

All endpoints should be prefixed with `/api/` (e.g., `/api/auth/login`).

## Required Endpoints

### Authentication Endpoints
All authentication requests should handle CORS and accept JSON payloads.

#### 1. Login
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "username": "string",
  "password": "string"
}

Response (200):
{
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "username": "string",
    "email": "string",
    "role": "employee|manager",
    "firstName": "string (optional)",
    "lastName": "string (optional)",
    "profilePicture": "url_or_null"
  }
}

Response (401):
{
  "detail": "Invalid credentials"
}
```

#### 2. Get Current User
```
GET /api/auth/me
Authorization: Bearer {token}

Response (200):
{
  "id": "user_id",
  "username": "string",
  "email": "string",
  "role": "employee|manager",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "profilePicture": "url_or_null"
}
```

#### 3. Logout
```
POST /api/auth/logout
Authorization: Bearer {token}

Response (200):
{
  "message": "Logged out successfully"
}
```

#### 4. Forgot Password
```
POST /api/auth/forgot-password
Content-Type: application/json

Request:
{
  "email": "string"
}

Response (200):
{
  "message": "If email exists, password reset instructions have been sent"
}
```

### Product Analysis Endpoints

#### 1. Analyze Product
```
POST /api/products/analyze
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "product_url": "string",
  "review_count": 50
}

Response (200):
{
  "productName": "string",
  "productUrl": "string",
  "rating": number (1-5),
  "reviewCount": number,
  "summary": "string",
  "positiveAspects": ["string"],
  "negativeAspects": ["string"],
  "keyInsights": ["string"]
}
```

#### 2. Compare Products
```
POST /api/products/compare
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "product_url_1": "string",
  "product_url_2": "string"
}

Response (200):
{
  "product1": {
    "name": "string",
    "pros": ["string"],
    "cons": ["string"],
    "rating": number
  },
  "product2": {
    "name": "string",
    "pros": ["string"],
    "cons": ["string"],
    "rating": number
  },
  "recommendation": "string (personal opinion on which to buy)"
}
```

### User History & Management

#### 1. Get Analysis History
```
GET /api/analysis/history
Authorization: Bearer {token}

Response (200):
[
  {
    "id": "string",
    "productName": "string",
    "productUrl": "string",
    "analyzedAt": "2024-01-15T10:30:00Z",
    "rating": number,
    "reviewCount": number
  }
]
```

#### 2. Get All Users (Manager Only)
```
GET /api/users
Authorization: Bearer {token}

Response (200):
[
  {
    "id": "string",
    "username": "string",
    "email": "string",
    "photo_url": "string or null",
    "is_active": boolean,
    "created_at": "2024-01-15T10:30:00Z",
    "role": "employee|manager"
  }
]
```

#### 3. Create User (Manager Only)
```
POST /api/users
Authorization: Bearer {token}
Content-Type: multipart/form-data

Request:
{
  "username": "string",
  "email": "string",
  "password": "string",
  "photo": "File (optional)"
}

Response (201):
{
  "id": "string",
  "username": "string",
  "email": "string",
  "photo_url": "string or null",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "role": "employee"
}
```

#### 4. Get User Details (Manager Only)
```
GET /api/users/{id}
Authorization: Bearer {token}

Response (200):
{
  "id": "string",
  "username": "string",
  "email": "string",
  "photo_url": "string or null",
  "is_active": boolean,
  "created_at": "2024-01-15T10:30:00Z",
  "role": "employee|manager"
}
```

#### 5. Update User (Manager Only)
```
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

Request:
{
  "username": "string",
  "email": "string",
  "photo": "File (optional)"
}

Response (200):
{
  "id": "string",
  "username": "string",
  "email": "string",
  "photo_url": "string or null",
  "is_active": boolean,
  "created_at": "2024-01-15T10:30:00Z",
  "role": "employee|manager"
}
```

#### 6. Toggle User Active Status (Manager Only)
```
PATCH /api/users/{id}/activate
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "is_active": boolean
}

Response (200):
{
  "id": "string",
  "username": "string",
  "email": "string",
  "is_active": boolean,
  "photo_url": "string or null"
}
```

### Dashboard Endpoints

#### 1. Get Dashboard Statistics (Manager Only)
```
GET /api/dashboard/stats
Authorization: Bearer {token}

Response (200):
{
  "total_products_analyzed": number,
  "active_users": number,
  "inactive_users": number,
  "total_users": number
}
```

## Authentication Flow

1. User enters credentials on login page
2. Frontend sends POST to `/api/auth/login`
3. Backend returns JWT token and user data
4. Frontend stores token in localStorage
5. All subsequent requests include `Authorization: Bearer {token}` header
6. On logout, token is removed from localStorage

## CORS Configuration

Your Django backend must allow CORS requests from your frontend domain. In Django, use `django-cors-headers`:

```python
# settings.py
INSTALLED_APPS = [
    ...
    'corsheaders',
    ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',  # Development
    'https://yourdomain.com',  # Production
]

CORS_ALLOW_CREDENTIALS = True
```

## Error Handling

All endpoints should return appropriate HTTP status codes:

- `200` - OK
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

Error responses should follow this format:

```json
{
  "detail": "Error message description",
  "code": "ERROR_CODE (optional)"
}
```

## Environment Variables

Make sure to set in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Change `http://localhost:8000` to your actual Django backend URL in production.

## Testing the Integration

1. Start your Django backend on `http://localhost:8000`
2. Start the frontend: `pnpm dev`
3. Go to `http://localhost:3000/login`
4. Try logging in with test credentials
5. Check browser console and network tab for any errors

## Common Issues

### CORS Errors
- Verify Django CORS settings include your frontend domain
- Check that `Content-Type` headers are correct

### 401 Unauthorized
- Ensure token is being sent correctly
- Check token format: `Authorization: Bearer {token}`
- Verify token hasn't expired

### 404 Not Found
- Check endpoint paths match exactly
- Ensure `/api/` prefix is included

### File Upload Issues (Profile Picture)
- Use `multipart/form-data` for file uploads
- Don't set `Content-Type` header in fetch (let browser set it)
- The frontend handles this automatically
