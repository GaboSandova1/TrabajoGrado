# ReviewAI Frontend - Views Summary

Complete overview of all implemented views in the ReviewAI frontend application.

## Public Views

### Login (`/login`)
- Username and password input fields
- "Forgot Password" link that opens a modal
- Error handling for failed login attempts
- Redirects authenticated users to dashboard/profile
- Professional card-based design

### Forgot Password Modal
- Email input field for password recovery
- Accessible modal component
- Sends reset email via backend API
- Displays success/error messages

## Employee Views

All employee views are protected and only accessible to users with `role: "employee"`.

### Profile (`/employee/profile`)
**Purpose**: View personal information and analysis history

**Features**:
- Display user photo, username, and email
- Show total analyses performed
- Table with analysis history:
  - Product name
  - URL
  - Rating
  - Number of reviews analyzed
  - Date analyzed
- Side information panel with statistics

**API Calls**:
- `GET /api/auth/me` - Get current user
- `GET /api/analysis/history` - Get user's analysis history

### Analyze Product (`/employee/analyze`)
**Purpose**: Analyze a single Amazon product by URL

**Features**:
- URL input field (centered)
- Dropdown selector for number of reviews (50, 100, 200, 500)
- "Analyze" button
- Results display showing:
  - Product name and image
  - Overall rating (1-5 stars)
  - Review count
  - Summary of reviews
  - Positive aspects (bulleted list)
  - Negative aspects (bulleted list)
  - Key insights and recommendations

**API Calls**:
- `POST /api/products/analyze` - Submit product URL for analysis

### Compare Products (`/employee/compare`)
**Purpose**: Compare two Amazon products side by side

**Features**:
- Two URL input fields (one for each product)
- "Compare" button
- Comparison results displayed in two columns showing:
  - Product 1:
    - Name and image
    - Rating
    - Pros (bulleted)
    - Cons (bulleted)
  - Product 2:
    - Name and image
    - Rating
    - Pros (bulleted)
    - Cons (bulleted)
  - Recommendation: AI's personal opinion on which to buy

**API Calls**:
- `POST /api/products/compare` - Compare two products

## Manager Views

All manager views are protected and only accessible to users with `role: "manager"`.

### Dashboard (`/manager/dashboard`)
**Purpose**: Central hub for manager overview of the system

**Features**:
- Four statistics cards:
  - Total products analyzed (all time)
  - Total users in system
  - Active users (working)
  - Inactive users (vacation/terminated)
- Pie chart: Distribution of active vs inactive users
- Bar chart: Total product analyses
- Color-coded stats for quick visual scanning

**API Calls**:
- `GET /api/dashboard/stats` - Get system statistics

### Users List (`/manager/users`)
**Purpose**: View and manage all employees

**Features**:
- "New User" button (top right) - links to create user page
- Data table with columns:
  - User photo (thumbnail)
  - Username
  - Email
  - Active/Inactive status badge
  - "View Details" button for each user
- Responsive table layout
- Empty state message if no users exist
- Color-coded status badges (green for active, red for inactive)

**API Calls**:
- `GET /api/users` - Get all users list

### Create User (`/manager/users/create`)
**Purpose**: Create a new employee account

**Features**:
- Form fields:
  - Photo upload with preview
  - Username input
  - Email input
  - Password input
  - Confirm password input
- Validations:
  - All fields required
  - Passwords must match
  - Password minimum 6 characters
- "Create User" and "Cancel" buttons
- Success message with auto-redirect to users list
- Error messages for validation failures

**API Calls**:
- `POST /api/users` - Create new user (multipart/form-data)

### User Details (`/manager/users/[id]`)
**Purpose**: View, edit, and manage individual user

**Features**:

**Left Column (Main Info - 2/3 width)**:
- Edit mode toggle
- View mode shows:
  - User photo
  - User ID
  - Username
  - Email
  - Creation date
  - "Edit Information" button
- Edit mode shows:
  - Editable photo with change button
  - Editable username field
  - Editable email field
  - "Save Changes" and "Cancel" buttons

**Right Column (Status - 1/3 width)**:
- Current status badge (Active/Inactive)
- Toggle button:
  - "Activate User" if inactive
  - "Deactivate User" if active
- Status description text
- Color-coded button (green for activate, red for deactivate)

**Features**:
- Back button to users list
- Success/error message displays
- Form validation before save
- Loading states for async operations

**API Calls**:
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user (multipart/form-data)
- `PATCH /api/users/{id}/activate` - Toggle active status

## Shared Components

### Sidebar
- Navigation menu (appears on all authenticated pages)
- Links based on user role:
  - **Employee**: My Profile, Analyze Product, Compare Products
  - **Manager**: Dashboard, Users
- User name display at top
- Logout button at bottom
- Active link highlighting
- Responsive design (collapses on mobile)

### Protected Route
- Checks user authentication
- Verifies required role
- Shows loading state while checking
- Redirects unauthenticated users to login
- Prevents role-based unauthorized access

### Forgot Password Modal
- Reusable modal component
- Email input field
- Send button
- Loading state during submission
- Success/error message display
- Close button and overlay clickability

## Design System

### Colors (Dark Theme)
- Background: Dark gray/black (`oklch(0.145 0 0)`)
- Foreground: Light text (`oklch(0.985 0 0)`)
- Primary: Blue/Purple (`oklch(0.488 0.243 264.376)`)
- Secondary: Medium gray (`oklch(0.269 0 0)`)
- Muted: Light gray text (`oklch(0.708 0 0)`)
- Success: Green (`#22c55e`)
- Destructive: Red (`oklch(0.396 0.141 25.723)`)

### Typography
- Font: Geist (sans-serif)
- Heading sizes: h1 (3xl), h2 (2xl), h3 (lg)
- Body text: regular weight
- UI labels: medium weight

### Components Used
- shadcn/ui: Button, Input, Card, Select, Alert
- Recharts: PieChart, BarChart for visualizations
- Custom: Sidebar, ProtectedRoute, ForgotPasswordModal

## Routing Structure

```
/                          → Redirect to role-based dashboard
/login                     → Public login page
/employee/
  ├── profile              → User profile & history
  ├── analyze              → Single product analysis
  └── compare              → Product comparison
/manager/
  ├── dashboard            → System overview
  └── users/
      ├── (list)           → All users table
      ├── create           → Create new user
      └── [id]             → User details & edit
```

## Navigation Flow

1. **Not Logged In**
   - All routes redirect to `/login`
   
2. **Employee Login**
   - Redirects to `/employee/profile`
   - Can navigate to analyze/compare via sidebar
   - Cannot access `/manager` routes
   
3. **Manager Login**
   - Redirects to `/manager/dashboard`
   - Can navigate to users via sidebar
   - Cannot access `/employee` routes

4. **Logout**
   - Token cleared from localStorage
   - Redirects to `/login`
   - All protected routes become inaccessible

## State Management

### Authentication Context (`AuthContext`)
- `user`: Current authenticated user object
- `isLoading`: Authentication check in progress
- `isAuthenticated`: Boolean user is logged in
- `login()`: Function to authenticate
- `logout()`: Function to clear session

### Component States
- Form data (inputs, uploads)
- Loading/submitting states
- Error messages
- Success messages
- Modal visibility
- Edit mode toggles

## Error Handling

- API errors caught and displayed to user
- Form validation before submission
- Fallback error messages
- Network error handling
- 401/403 redirects to login
- User-friendly error text

## Responsive Design

- Mobile-first approach
- Sidebar hides/collapses on mobile
- Tables become scrollable on small screens
- Cards stack vertically on mobile
- Touch-friendly button sizes
- Grid layouts adjust columns (1 col mobile, 2-4 cols desktop)

## Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly
- Focus indicators on form inputs
