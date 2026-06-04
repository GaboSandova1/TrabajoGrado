# ReviewAI - Intelligent Amazon Reviews Analyzer Frontend

A professional, full-featured Next.js frontend for analyzing Amazon product reviews using AI. Supports two user roles: Employee and Manager with distinct functionality.

## Quick Start

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your Django backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
pnpm dev
```

Then open `http://localhost:3000` in your browser.

## Features

### For Employees
- **Product Analysis**: Analyze single Amazon products with customizable review count
- **Product Comparison**: Compare two products side-by-side with AI recommendations
- **Profile & History**: View personal information and complete analysis history

### For Managers
- **Dashboard**: Real-time system statistics with visual charts
- **User Management**: Create, edit, activate/deactivate employee accounts
- **System Monitoring**: Track active users, total analyses, and system health

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts for data visualization
- **Form Handling**: React Hook Form + Zod validation
- **HTTP Client**: Fetch API with custom hook
- **State Management**: React Context API

## Project Structure

```
ReviewAI Frontend/
├── app/
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Home redirect based on role
│   ├── login/
│   │   └── page.tsx        # Login page
│   ├── employee/           # Employee routes
│   │   ├── layout.tsx      # Employee layout with sidebar
│   │   ├── profile/
│   │   ├── analyze/
│   │   └── compare/
│   ├── manager/            # Manager routes
│   │   ├── layout.tsx      # Manager layout with sidebar
│   │   ├── dashboard/
│   │   └── users/
│   │       ├── page.tsx    # Users list
│   │       ├── create/
│   │       └── [id]/
│   └── globals.css         # Global styles + design tokens
├── components/
│   ├── Sidebar.tsx         # Navigation component
│   ├── ForgotPasswordModal.tsx
│   ├── ProtectedRoute.tsx  # Route protection
│   └── ui/                 # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx     # Authentication state
├── hooks/
│   └── useApi.ts           # API request utility
├── lib/
│   └── utils.ts            # Helper functions
└── middleware.ts           # Next.js middleware
```

## Installation & Setup

### Prerequisites
- Node.js 16+
- pnpm (or npm/yarn)
- Django backend running (for API)

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Point to your Django backend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Start Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### Step 4: Connect to Backend
Ensure your Django backend is running and has the required endpoints. See [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md) for details.

## Authentication

The application uses JWT token-based authentication:

1. User logs in with username/password
2. Backend returns JWT token and user data
3. Token is stored in `localStorage`
4. All API requests include `Authorization: Bearer {token}` header
5. On logout, token is removed from localStorage

## Routes & Permissions

### Public Routes
- `/login` - Login page (redirects to home if already authenticated)

### Employee Routes
- `/employee/profile` - View profile and analysis history
- `/employee/analyze` - Analyze single product
- `/employee/compare` - Compare two products

### Manager Routes
- `/manager/dashboard` - System overview and statistics
- `/manager/users` - List all employees
- `/manager/users/create` - Create new employee
- `/manager/users/[id]` - View/edit employee details

## API Integration

All API calls go through the `useApi()` hook which:
- Automatically includes JWT token in headers
- Handles errors and throws exceptions
- Sets loading/error state
- Makes requests to `NEXT_PUBLIC_API_URL + endpoint`

**Example:**
```typescript
const { request } = useApi()

// GET request
const data = await request('/api/products/analyze', {
  method: 'POST',
  body: { product_url: 'https://amazon.com/...' }
})
```

See [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md) for complete API specification.

## Design System

### Color Palette (Dark Theme)
- **Background**: Dark gray (`oklch(0.145 0 0)`)
- **Foreground**: Light text (`oklch(0.985 0 0)`)
- **Primary**: Blue (`oklch(0.488 0.243 264.376)`)
- **Success**: Green (`#22c55e`)
- **Destructive**: Red (`oklch(0.396 0.141 25.723)`)

### Typography
- **Font**: Geist (sans-serif)
- **Headings**: Bold, sizes from lg to 3xl
- **Body**: Regular weight, good line-height

### Components
- Uses shadcn/ui for consistency
- Tailwind CSS for styling
- Custom Sidebar and ProtectedRoute components
- Recharts for data visualization

## Common Tasks

### Adding a New View
1. Create folder in `app/{role}/[feature]/`
2. Add `page.tsx` with `'use client'` directive
3. Use `ProtectedRoute` component to enforce role
4. Import `Sidebar` from shared components
5. Use `useApi()` for backend calls

### Making API Requests
```typescript
'use client'
import { useApi } from '@/hooks/useApi'

export default function Component() {
  const { request, loading, error } = useApi()
  
  const handleFetch = async () => {
    try {
      const data = await request('/api/endpoint', {
        method: 'POST',
        body: { key: 'value' }
      })
      // Use data...
    } catch (err) {
      // Handle error...
    }
  }
}
```

### Handling Forms
```typescript
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  username: z.string().min(3),
  email: z.string().email()
})

export default function Form() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  })
  
  const onSubmit = async (data) => {
    // Submit to backend...
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields... */}
    </form>
  )
}
```

## Troubleshooting

### "CORS error" or "Failed to fetch"
- Check Django backend is running
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure Django has CORS enabled for your frontend domain

### "Unauthorized" or "Cannot read property of undefined"
- Token may have expired
- Try logging in again
- Check browser console for exact error

### "Page not found" but route exists
- Verify role permissions (employees can't access `/manager`, etc.)
- Check that you're logged in with correct role
- Clear browser cache if CSS/JS isn't updating

### File uploads not working
- Ensure backend accepts `multipart/form-data`
- Check that image dimensions are reasonable
- Verify CORS allows file uploads

## Building for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

The production build optimizes:
- Code splitting
- Image optimization
- CSS/JS minification
- Tree shaking unused code

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Base URL of Django backend |
| `NODE_ENV` | No | `development` | Environment mode |

## Performance Optimization

- Image optimization with Next.js Image component
- Code splitting per route
- Automatic minification and compression
- CSS/JavaScript bundling with Tailwind v4
- SWR-style caching via API hook
- Lazy loading of heavy components

## Security

- JWT token stored in localStorage (not accessible to XSS if Content Security Policy is set)
- All API requests require authentication token
- Role-based access control on routes
- Protected routes check user role before rendering
- CORS validation on backend

## Browser Support

- Chrome/Edge latest
- Firefox latest
- Safari latest
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

To add new features:
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following existing patterns
3. Test in development mode: `pnpm dev`
4. Submit pull request with description

## Support & Documentation

- [SETUP.md](./SETUP.md) - Detailed setup guide
- [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md) - Backend API specification
- [VIEWS_SUMMARY.md](./VIEWS_SUMMARY.md) - Complete views documentation
- Next.js docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com

## License

This project is private and proprietary.

## Contact

For issues or questions, refer to the documentation files or contact the development team.
