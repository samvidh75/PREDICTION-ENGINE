# AGENT F — Real User Journey Test

## New User Journey (Simulated)

### Step 1: Landing → Login
- URL: ?page=landing → ?page=login
- Clicks: 2 (landing CTA → login form)
- Friction: LOW (standard login flow)

### Step 2: Search Stock
- Action: Search box → type "RELIANCE"
- Clicks: 1 (search result selection)
- Friction: LOW if symbol exists, MEDIUM if typo/no result
- Dead end risk: No fuzzy search for typos

### Step 3: Open Superpage
- URL: ?page=stock&id=RELIANCE
- Content: 7 sections load
- Friction: LOW (good loading states)
- Missing CTA: No "Compare with..." quick-link on Superpage

### Step 4: Compare Stocks
- URL: ?page=compare
- Action: Enter RELIANCE + INFY → click Compare
- Clicks: 3 (navigate + 2 inputs + button)
- Friction: MEDIUM (compare page hidden, no direct link from Superpage)

### Step 5: Add Watchlist
- Action: Click "Add to Watchlist" on Superpage
- Clicks: 1
- Friction: LOW

### Step 6: Read Trust Centre
- URL: ?page=trust
- Friction: HIGH (buried in nav, no link from Superpage transparency section)

### Step 7: View Prediction Journal
- URL: ?page=journal
- Content: Table of predictions (or "no predictions" if empty)
- Friction: LOW if data exists, HIGH if empty (missed trust opportunity)

## Total Clicks: ~12
## Dead Ends Identified: 3 (typo search, compare discoverability, trust centre discoverability)
## Missing CTAs: 2 (compare from superpage, trust link from superpage)
