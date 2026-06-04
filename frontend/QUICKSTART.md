# Quick Start Guide - ReviewAI Frontend

Get the ReviewAI frontend up and running in 5 minutes.

## Prerequisites

Before you start, make sure you have:
- Node.js 16 or higher installed
- pnpm installed (`npm install -g pnpm`)
- Your Django backend ready and running

## Step 1: Installation (2 minutes)

```bash
# Navigate to project directory
cd /path/to/v0-project

# Install all dependencies
pnpm install
```

## Step 2: Environment Setup (1 minute)

```bash
# Create environment file from template
cp .env.example .env.local

# Edit .env.local
nano .env.local  # or use your favorite editor
```

**Important**: Set the correct Django backend URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Change `http://localhost:8000` to match your Django server's actual URL.

## Step 3: Start Development Server (instant)

```bash
pnpm dev
```

You should see:
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
```

## Step 4: Test the App

1. Open `http://localhost:3000` in your browser
2. You should see the login page
3. Log in with test credentials from your Django backend

**If you see errors:**

❌ **"API call failed"** 
- Check that `NEXT_PUBLIC_API_URL` in `.env.local` is correct
- Verify your Django backend is running
- Check browser console (F12) for detailed error

❌ **"CORS error"**
- Your Django backend needs CORS enabled
- See DJANGO_INTEGRATION.md for CORS setup

❌ **"Cannot find module"**
- Run `pnpm install` again
- Delete `node_modules` and `.pnpm-lock.yaml`, then reinstall

## User Roles

The app has two different interfaces based on login role:

### Employee Login
After login with an employee account, you'll see:
- **Sidebar** with: Profile, Analyze Product, Compare Products
- **Profile page**: Your information and analysis history
- **Analyze**: Input a product URL, select review count, get analysis
- **Compare**: Input two URLs, get side-by-side comparison with recommendation

### Manager Login
After login with a manager account, you'll see:
- **Sidebar** with: Dashboard, Users
- **Dashboard**: Statistics and charts about the system
- **Users**: List of all employees, create new, view details

## Common Tasks

### Change Django Backend URL
```bash
# Edit .env.local
NEXT_PUBLIC_API_URL=https://your-backend.com
```

Then restart the dev server (Ctrl+C, then `pnpm dev`)

### Stop the Server
Press `Ctrl+C` in the terminal

### View Console Errors
1. Open browser DevTools (F12)
2. Click "Console" tab
3. Reload page (Ctrl+R)
4. Look for red error messages

### Check Network Requests
1. Open browser DevTools (F12)
2. Click "Network" tab
3. Reload page
4. Click on requests to see status and response

### Hot Reload
The app automatically reloads when you change code. Just save the file and check your browser.

## File Structure Quick Reference

```
Important files to know:

.env.local                          ← Your API configuration
contexts/AuthContext.tsx            ← Login/logout logic
hooks/useApi.ts                     ← How API calls work
app/login/page.tsx                  ← Login page
app/employee/                       ← Employee views
app/manager/                        ← Manager views
components/Sidebar.tsx              ← Navigation menu
```

## Next Steps

1. **Understand the API**: Read [DJANGO_INTEGRATION.md](./DJANGO_INTEGRATION.md)
2. **View Details**: Read [VIEWS_SUMMARY.md](./VIEWS_SUMMARY.md)
3. **Full Setup**: Read [SETUP.md](./SETUP.md)
4. **Full Project Info**: Read [README_PROJECT.md](./README_PROJECT.md)

## Deployment

When ready for production:

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

Or deploy to Vercel with one click:
1. Push code to GitHub
2. Import in Vercel
3. Set `NEXT_PUBLIC_API_URL` environment variable
4. Deploy

## Support

**Issue**: Not seeing changes after code edit
- **Solution**: Save file (Ctrl+S), wait 2-3 seconds, refresh browser

**Issue**: "Page not found" after login
- **Solution**: Check your role has access to that page
- Employees: `/employee/*`
- Managers: `/manager/*`

**Issue**: Login fails
- **Solution**: Check Django backend is running
- Test API manually: `curl http://localhost:8000/api/auth/login`

**Issue**: Images not uploading
- **Solution**: Check CORS allows file uploads
- Max size usually 5MB - try smaller image

## Need Help?

1. Check the full documentation files
2. Look at browser console errors (F12)
3. Check Network tab to see API responses
4. Verify Django backend is responding

## Quick Commands Reference

```bash
# Start development
pnpm dev

# Build for production
pnpm build

# Start production build
pnpm start

# Run linter
pnpm lint

# Install dependencies
pnpm install

# Update packages
pnpm update
```

---

**You're all set!** 🎉 The frontend is ready to connect to your Django backend.

Make sure:
1. ✅ Django backend is running
2. ✅ `NEXT_PUBLIC_API_URL` is set correctly
3. ✅ Frontend is running with `pnpm dev`
4. ✅ You can access `http://localhost:3000`
