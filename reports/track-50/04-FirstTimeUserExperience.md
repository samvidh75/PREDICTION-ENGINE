# AGENT D — First-Time User Experience

## Implementation: src/components/onboarding/WelcomeExperience.tsx

### Experience Flow (60 seconds total)
1. **Health Score** (12s max) — "Think of it like a credit score for companies"
2. **Future Health** (12s max) — "Trajectory matters more than point score"
3. **Risk Assessment** (12s max) — "We scan for what traditional screeners miss"
4. **Narrative** (12s max) — "You get the story behind the scores"
5. **Prediction History** (12s max) — "No cherry-picking. Full transparency."

### UX Features
- Full-screen overlay with backdrop blur
- Progress bar (gradient: cyan to violet)
- Auto-advance timer (12s per step)
- Skip button (no forced onboarding)
- Back/Next navigation
- localStorage persistence (ssi_welcome_completed)
- Never shown twice

### Rendering in App.tsx
```tsx
import { WelcomeExperience } from './components/onboarding/WelcomeExperience';
// Inside AppContent, before mainView:
<WelcomeExperience />
```