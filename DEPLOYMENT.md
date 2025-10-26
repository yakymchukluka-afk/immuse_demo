# Vercel Deployment Guide

## Pre-Deployment Checklist

✅ Removed exposed API keys from repository
✅ Added `vercel.json` configuration
✅ Updated `.gitignore` to exclude sensitive files
✅ Fixed OpenAI API compatibility issues
✅ Fixed TypeScript interface definitions

## Deployment Steps

### 1. Environment Variables Setup

In your Vercel project settings, add the following environment variables:

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key (already in Vercel environment)
- `DATABASE_URL` - SQLite database path for Vercel
  - **Recommended:** `file:./prisma/dev.db`
- `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL
  - Example: `https://immuse-demo.vercel.app`

### 2. Important Considerations

#### ⚠️ SQLite Limitations on Vercel

**SQLite is NOT suitable for production on Vercel** because:
- Vercel uses a serverless, stateless architecture
- SQLite requires a persistent filesystem
- Each deployment creates a new container without persistent storage
- Database will be reset on every deployment

**Recommendations:**
1. **For MVP/Testing:** Use Vercel's Postgres (built-in) or external database
2. **Free alternatives:**
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (recommended)
   - [Turso](https://turso.tech/) (SQLite-compatible, serverless-friendly)
   - [Neon](https://neon.tech/) (Postgres)

#### ⚠️ File Storage Limitations

The app currently stores files in `uploads/` directory, which:
- Will be lost on each deployment
- Requires persistent storage solution

**Recommended solutions:**
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [AWS S3](https://aws.amazon.com/s3/)
- [Cloudinary](https://cloudinary.com/)

### 3. Deploy from GitHub

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository: `yakymchukluka-afk/immuse_demo`
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `prisma generate && next build` (already in vercel.json)
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

5. Add environment variables (see step 1)

6. Click "Deploy"

### 4. Post-Deployment Setup

After deployment:

1. **Verify environment variables:**
   - Check Vercel dashboard → Settings → Environment Variables
   - Ensure `OPENAI_API_KEY` is set

2. **Check deployment logs:**
   - Vercel dashboard → Deployments → [Your deployment] → Build Logs
   - Look for "Prisma generate" and "Next build" success messages

3. **Test the deployment:**
   - Visit your Vercel URL
   - Test API endpoints using `/api/test-openai`

### 5. Database Migration

If you migrate to a different database:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql" // or "mysql", "sqlite", etc.
     url      = env("DATABASE_URL")
   }
   ```

2. Update environment variables in Vercel

3. Run migration:
   ```bash
   npx prisma migrate deploy
   ```

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure `OPENAI_API_KEY` is set
- Verify Prisma generates successfully

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify database connection
- Check file storage implementation

### API Key Issues
- Ensure environment variable name matches code: `OPENAI_API_KEY`
- Check variable is set for correct environment (Production/Preview/Development)

## Next Steps

1. ✅ Deploy to Vercel
2. ⬜ Migrate to persistent database (Postgres/Turso/Neon)
3. ⬜ Implement cloud storage for file uploads
4. ⬜ Set up custom domain (optional)
5. ⬜ Configure CI/CD for automatic deployments

## Useful Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Project Repository](https://github.com/yakymchukluka-afk/immuse_demo)
