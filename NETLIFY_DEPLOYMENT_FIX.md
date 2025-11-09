# Netlify 404 Error Fix

## Problem
Getting "Page not found" (404) errors when accessing routes like `/login` on Netlify deployment.

## Root Cause
Single Page Applications (SPAs) using client-side routing need special configuration to handle direct URL access. When you visit `yoursite.netlify.app/login` directly, Netlify tries to find a `login.html` file, which doesn't exist. All routes should be handled by `index.html` and React Router.

## Solution Applied

### 1. Created `public/_redirects` file
This file tells Netlify to redirect all routes to `index.html`:
```
/*    /index.html   200
```

### 2. Updated `netlify.toml`
Added `force = false` to the redirect rule for better compatibility.

### 3. Updated `vite.config.js`
Added explicit build configuration:
- `base: '/'` - Ensures correct base path
- `build.outDir: 'dist'` - Output directory
- `build.assetsDir: 'assets'` - Assets directory
- `build.emptyOutDir: true` - Clean build

## Deployment Steps

1. **Rebuild the project:**
   ```bash
   npm run build
   ```

2. **Verify `_redirects` file exists in `dist` folder** (it should be copied automatically from `public/`)

3. **Deploy to Netlify:**
   - Push changes to your Git repository
   - Netlify will automatically rebuild and deploy
   - OR manually drag and drop the `dist` folder to Netlify

4. **Test the deployment:**
   - Visit your site's root URL
   - Try accessing `/login` directly
   - All routes should now work correctly

## Additional Notes

- The `_redirects` file in the `public/` folder is automatically copied to `dist/` during build
- Both `netlify.toml` and `_redirects` work together for maximum compatibility
- The redirect rule uses status 200 (rewrite) instead of 301/302 (redirect) to maintain the URL in the browser

## Troubleshooting

If the issue persists:
1. Clear Netlify's cache: Site settings → Build & deploy → Clear cache and retry deploy
2. Check build logs for errors
3. Verify environment variables are set correctly (especially Supabase keys)
4. Ensure Node version matches (18 as specified in netlify.toml)
