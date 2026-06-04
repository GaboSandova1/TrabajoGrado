# ReviewAI - Frontend Setup Guide

## Project Overview

This is the frontend for the ReviewAI application - an intelligent Amazon product review analyzer with support for employee and manager roles.

## Prerequisites

- Node.js 16+ and pnpm/npm
- Your Django backend running on the specified API URL

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

4. Configure the API URL in `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
   Replace `http://localhost:8000` with your Django backend URL.

## Running the Application

Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
app/
├── login/                 # Login page
├── employee/             # Employee role views
│   ├── profile/         # User profile and history
│   ├── analyze/         # Single product analysis
│   └── compare/         # Product comparison
└── manager/             # Manager role views
    ├── dashboard/       # Main dashboard with stats
    └── users/          # User management
        ├── create/     # Create new user
        └── [id]/       # User details and edit

components/
├── Sidebar.tsx          # Navigation sidebar
├── ForgotPasswordModal.tsx  # Password recovery modal
├── ProtectedRoute.tsx   # Route protection component
└── ui/                  # shadcn/ui components

contexts/
└── AuthContext.tsx      # Authentication state management

hooks/
└── useApi.ts           # API request hook

lib/
└── utils.ts            # Utility functions
```

## Features

### Employee Views
- **Profile**: View user information and analysis history
- **Analyze Product**: Analyze a single Amazon product by URL
- **Compare Products**: Compare two Amazon products side by side

### Manager Views
- **Dashboard**: View system statistics and charts
  - Total products analyzed
  - Total users
  - Active/Inactive users
  - Visual charts
- **User Management**: 
  - List all employees
  - Create new employees
  - View/Edit employee details
  - Activate/Deactivate employees

## Authentication

The application connects to your Django backend for authentication. Login is handled via:

- **Endpoint**: `POST /api/auth/login`
- **Expected Response**: 
  ```json
  {
    "token": "your-jwt-token",
    "user": {
      "id": "user-id",
      "username": "username",
      "email": "email@example.com",
      "role": "employee|manager",
      "firstName": "First",
      "lastName": "Last",
      "profilePicture": "url-to-picture"
    }
  }
  ```

## API Endpoints Expected

The frontend expects the following endpoints on your Django backend:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password recovery

### Products
- `POST /api/products/analyze` - Analyze a product
- `POST /api/products/compare` - Compare two products
- `GET /api/analysis/history` - Get user's analysis history

### Users (Manager Only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `PATCH /api/users/{id}/activate` - Toggle user activation

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Styling

The application uses:
- **Tailwind CSS v4** for styling
- **shadcn/ui** for UI components
- **Recharts** for data visualization
- Dark theme with professional color scheme

## Environment Variables

### Required
- `NEXT_PUBLIC_API_URL` - Base URL of your Django backend

### Optional
- `NODE_ENV` - Set to `production` for production builds

## Troubleshooting

### "API connection failed"
- Ensure your Django backend is running
- Check the `NEXT_PUBLIC_API_URL` is correct
- Verify CORS is configured on the backend if running on different ports

### "Authentication failed"
- Verify the login endpoint returns the correct token and user data
- Check that the token is being stored in localStorage

### "Protected route redirect"
- Ensure you're logged in with the correct role
- Check the browser console for authentication errors

## Building for Production

```bash
pnpm build
pnpm start
```

## Support

For issues or questions, check:
1. The browser console for errors
2. Your Django backend logs
3. The network tab in browser DevTools to inspect API calls
