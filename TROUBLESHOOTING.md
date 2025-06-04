# 🔧 ClinicBoost Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. **"Invalid login credentials" Error**

**Problem:** Demo credentials not working, getting authentication errors.

**Solution:**
1. **Check Demo Mode:** Ensure `VITE_DEMO_MODE=true` in `.env.local`
2. **Restart Server:** Stop and restart `npm run dev`
3. **Clear Browser Cache:** Hard refresh (Ctrl+F5) or clear browser cache
4. **Verify Environment:** Visit `/env-test` to check environment variables

**Demo Credentials:**
- **Email:** `admin@clinicboost.demo`
- **Password:** `demo123`

### 2. **"Supabase URL must use HTTPS" Error**

**Problem:** Configuration validation error preventing app startup.

**Solution:**
1. **Enable Demo Mode:** Set `VITE_DEMO_MODE=true` in `.env.local`
2. **Comment Out Supabase:** Disable Supabase credentials in `.env.local`:
   ```
   # VITE_SUPABASE_URL=your-url
   # VITE_SUPABASE_ANON_KEY=your-key
   ```
3. **Restart Server:** `npm run dev`

### 3. **"Process is not defined" Error**

**Problem:** Node.js process object not available in browser.

**Solution:** This has been fixed in the latest version. If you still see this:
1. **Update Code:** Ensure you have the latest version
2. **Clear Cache:** Clear browser cache and restart server
3. **Check Console:** Look for any remaining process references

### 4. **"Maximum update depth exceeded" Error**

**Problem:** Infinite re-render loop in React components.

**Solution:** This has been fixed with proper memoization. If you still see this:
1. **Restart Server:** `npm run dev`
2. **Clear Browser Cache:** Hard refresh the page
3. **Check Console:** Look for any dependency array issues

### 5. **Environment Variables Not Loading**

**Problem:** Environment variables showing as undefined.

**Solution:**
1. **Check File Name:** Ensure file is named `.env.local` (not `.env`)
2. **Check Format:** Variables must start with `VITE_` for client-side access
3. **Restart Server:** Environment changes require server restart
4. **Verify Location:** `.env.local` should be in project root

### 6. **Demo Mode Not Activating**

**Problem:** Application still trying to use Supabase instead of demo mode.

**Solution:**
1. **Set Demo Flag:** Add `VITE_DEMO_MODE=true` to `.env.local`
2. **Disable Supabase:** Comment out Supabase environment variables
3. **Check Detection:** Visit `/env-test` to verify demo mode status
4. **Restart Server:** `npm run dev`

### 7. **Mobile Testing Not Working**

**Problem:** Mobile testing dashboard showing errors.

**Solution:**
1. **Check Dependencies:** Ensure all mobile dependencies are installed
2. **Restart Server:** `npm run dev`
3. **Clear Cache:** Clear browser cache
4. **Check Console:** Look for any JavaScript errors

### 8. **Port Already in Use**

**Problem:** Server can't start because port is in use.

**Solution:**
1. **Use Different Port:** Vite will automatically try different ports
2. **Kill Process:** Find and kill the process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:5173 | xargs kill -9
   ```
3. **Restart Server:** `npm run dev`

## 🧪 Testing Pages

Use these pages to diagnose issues:

### Environment Test
**URL:** `/env-test`
**Purpose:** Check environment variables and demo mode status

### Authentication Test
**URL:** `/auth-test`
**Purpose:** Test authentication system directly

### Configuration Test
**URL:** `/config-test`
**Purpose:** Verify system configuration

### Mobile Testing
**URL:** `/mobile-testing`
**Purpose:** Test mobile responsiveness features

## 🔍 Debugging Steps

### 1. **Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages
4. Check for authentication logs

### 2. **Verify Environment Setup**
1. Check `.env.local` file exists
2. Verify `VITE_DEMO_MODE=true` is set
3. Ensure Supabase variables are commented out
4. Restart server after changes

### 3. **Test Authentication Flow**
1. Visit `/auth-test` page
2. Try "Test Direct Demo Auth" button
3. Check console for detailed logs
4. Verify demo credentials are recognized

### 4. **Clear Application State**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Clear localStorage (Application tab in DevTools)
3. Hard refresh page (Ctrl+F5)
4. Restart development server

## 📋 Environment File Template

Create `.env.local` with this content:

```env
# Demo Mode Configuration
VITE_DEMO_MODE=true

# Supabase Configuration (Disabled for demo)
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_ANON_KEY=your-supabase-key

# Application Configuration
VITE_APP_NAME=ClinicBoost
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_INTEGRATIONS=true
```

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check Latest Updates:** Ensure you have the latest code
2. **Restart Everything:** Stop server, clear cache, restart
3. **Check Dependencies:** Run `npm install` to ensure all packages are installed
4. **Review Console:** Look for any error messages in browser console
5. **Test Basic Functionality:** Try visiting `/env-test` first

## 📞 Quick Fixes

### Reset Everything:
```bash
# Stop server (Ctrl+C)
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Force Demo Mode:
```bash
# Add to .env.local
echo "VITE_DEMO_MODE=true" >> .env.local
# Restart server
npm run dev
```

### Clear Browser State:
1. Open DevTools (F12)
2. Application tab → Storage → Clear storage
3. Hard refresh (Ctrl+F5)

**Remember:** Most issues are resolved by ensuring `VITE_DEMO_MODE=true` is set and restarting the development server!
