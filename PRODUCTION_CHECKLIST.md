# Production Deployment Checklist

## Before Deployment
- [ ] All tests passing: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `tsc --noEmit`
- [ ] No linting errors: `npm run lint`
- [ ] Mobile responsive tested (375px)
- [ ] Desktop layout tested (1920px)
- [ ] All components rendering correctly
- [ ] No console errors in DevTools
- [ ] All API integrations verified

## Environment Setup
- [ ] Vercel environment variables set
- [ ] Supabase database tables created
- [ ] Groq API key added
- [ ] DNS configured to Vercel
- [ ] HTTPS/SSL enabled

## Deployment
- [ ] `git push origin main`
- [ ] Vercel build succeeds
- [ ] Health check passes: /api/health
- [ ] All endpoints responding

## Post-Deployment
- [ ] Monitor errors for 24h
- [ ] Monitor API usage (Groq, Supabase)
- [ ] Verify analytics dashboard
- [ ] Test all user workflows

## Rollback Plan
- [ ] `git revert <commit-hash>`
- [ ] `vercel --prod`
