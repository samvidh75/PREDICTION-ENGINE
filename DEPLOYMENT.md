# Deployment Guide - 100% Free Stack

## Prerequisites
- Node.js 18+
- Vercel account (free)
- Supabase account (free)
- Groq account (free)

## Step 1: Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:
- `VITE_GROQ_API_KEY` - From https://console.groq.com/keys
- `VITE_SUPABASE_URL` - From Supabase dashboard
- `VITE_SUPABASE_ANON_KEY` - From Supabase dashboard

## Step 2: Build

```bash
npm run build
```

Output in `dist/`

## Step 3: Deploy to Vercel

```bash
vercel --prod
```

Or connect GitHub repo to Vercel dashboard for auto-deploy on push.

## Step 4: Verify

Open admin dashboard:
- `https://stockstory-prod.vercel.app/admin/metrics`

## Cost Verification

- Vercel: Rs 0/month (free tier)
- Supabase: Rs 0/month (free tier, 500MB included)
- Groq: Rs 0/month (free tier, no card needed)
- Transformers.js: Rs 0/month (open-source)

**Total: Rs 0/month forever**
