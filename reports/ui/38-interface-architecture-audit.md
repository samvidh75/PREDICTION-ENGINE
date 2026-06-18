# Interface and Architecture Audit (SSI Research OS)

This document audits the visual and information-architecture problems of StockStory India (commit `93bc8354` or newer) across 11 routes, detailing the exact planned corrections for each route.

---

## 1. Landing / Public Home Page

*   **Current Visual Problems**: Excessive blank margins on widescreen devices, uneven vertical gaps, and flat, dry-looking hero elements.
*   **Current Navigation Problems**: Public landing header blends with authenticated shell components; lacks distinction between public site states and auth dashboard navigation.
*   **Hierarchy Problems**: Clear CTA flow is diluted by cluttered text segments; lacks a premium mock preview of the actual research tool interface.
*   **Color/Contrast Problems**: Harsh transitions between solid black sections and pure white surfaces, creating excessive visual friction.
*   **Typography Problems**: Letter spacing is tight; headings lack elegance, and fonts feel like default system stacks rather than a high-trust publication layout.
*   **Responsive Problems**: Product description columns shrink awkwardly on medium viewports; lacks a tailored, centered mobile layout structure.
*   **Data-Display Problems**: Lack of real public asset metrics; reliance on empty or placeholder states that reduce credibility.
*   **Exact Intended Redesign**: 
    *   Introduce a clean, premium top nav with a refined SSI logo and distinct login/signup buttons.
    *   Craft a hero area with a high-readability serif/sans heading.
    *   Embed a structured, interactive preview container showcasing live coverage statistics (using actual database counts) and an empty-safe visual preview of a company research card.
    *   Include a provider grid highlighting data sources with exact coverage counts.

---

## 2. Authenticated Dashboard / Home

*   **Current Visual Problems**: Disconnected cards, uneven spacing, and generic card wrappers that feel like a generic SaaS template.
*   **Current Navigation Problems**: Layout is cluttered; floating buttons block critical content on small viewports.
*   **Hierarchy Problems**: Low hierarchy contrast between key metrics (companies covered, signals) and secondary panels.
*   **Color/Contrast Problems**: Accents are noisy and inconsistent; background elements interfere with readability.
*   **Typography Problems**: Mixed typography weights; inconsistent label styles.
*   **Responsive Problems**: Floating action buttons overlap cards on mobile viewports; grid margins shrink too close to the screen edges.
*   **Data-Display Problems**: Disorganized layout that does not guide the analyst to the most pressing updates.
*   **Exact Intended Redesign**:
    *   Construct a cohesive "Research Workspace" dashboard centered around a neat status-bar hero.
    *   Implement compact metric cards with clear tabular data for total coverage.
    *   Arrange a "Research Queue" grouping recent signal changes and highest confidence candidates.
    *   Add a direct "System Data Health" widget linked directly to the Trust Centre.

---

## 3. Search Page

*   **Current Visual Problems**: A massive, stark input field that feels empty and detached from the research flow.
*   **Current Navigation Problems**: Tapping search on mobile opens overlays that cover top/bottom navigation entirely.
*   **Hierarchy Problems**: Result rows look identical, making it hard to quickly scan the status of a symbol (e.g. Scored vs. Pending).
*   **Color/Contrast Problems**: Highlights are either overly bright or invisible.
*   **Typography Problems**: Mismatched font sizes for stock symbols, descriptions, and scores.
*   **Responsive Problems**: Horizontal overflow in search result tables on narrow viewports (e.g., 320px).
*   **Data-Display Problems**: Lacks clarity on whether a company is covered, pending, or manual fundamentals only.
*   **Exact Intended Redesign**:
    *   Rebuild the search bar into a compact, embedded search component in the top navigation bar.
    *   Represent search results in a clear list structure containing: Symbol, Name, Scored/Pending Badge, and a clear "Inspect company" or "Add to watchlist" action.

---

## 4. Rankings / Scanner Page

*   **Current Visual Problems**: Giant tables with harsh grid borders, loud green/amber badges, and inconsistent row padding.
*   **Current Navigation Problems**: No direct links to understanding the underlying scoring methodology from the table context.
*   **Hierarchy Problems**: Confusing columns that place raw formulas alongside final indicators without clear visual grouping.
*   **Color/Contrast Problems**: Multi-color accent tags that resemble a casual retail trading website.
*   **Typography Problems**: Column headers use default spacing; large numbers lack tabular formatting, causing columns to misalign.
*   **Responsive Problems**: Table collapses into an unreadable horizontal-scrolling viewport on mobile screens.
*   **Data-Display Problems**: Uses advice-sounding terms like "AI Picks" or "Strong Buy".
*   **Exact Intended Redesign**:
    *   Provide a premium, clear table structure for desktop, converting into stacked company metric card lists (`MobileCardList`) on mobile.
    *   Add a methodology link clearly stating: "Based on empirical factor modeling. Not financial advice."
    *   Limit colors strictly to Emerald (ok/scored) and Muted Slate.

---

## 5. Company Detail Page

*   **Current Visual Problems**: Messy panels, random outline widths, and cheap-looking shadow states.
*   **Current Navigation Problems**: Squeezed navigation headers; difficult to toggle back to rankings or dashboard without losing context.
*   **Hierarchy Problems**: Lacks a clear hero summary of the company's valuation or factor score.
*   **Color/Contrast Problems**: Too many high-contrast elements fighting for attention.
*   **Typography Problems**: Chaotic sizes; large numbers in factor breakdown are not aligned correctly.
*   **Responsive Problems**: Chart displays shrink or truncate on mobile viewports; details overflow horizontally.
*   **Data-Display Problems**: Displays empty rows, or fakes a news panel.
*   **Exact Intended Redesign**:
    *   Redesign as the premier "Stock Story Workspace".
    *   Include a sticky compact header detailing the ticker, company name, latest real price, and score.
    *   Present a clean, structural factor breakdown grid.
    *   Embed a dedicated "Fundamentals Audit Card" showing actual data snapshots with a "Manual Import CSV" fallback.

---

## 6. Watchlist Page

*   **Current Visual Problems**: Stark empty cards and plain, unstyled tables.
*   **Current Navigation Problems**: Clunky "Add Symbol" flow.
*   **Hierarchy Problems**: Lacks visual grouping for high-confidence vs. low-confidence signals in watched stocks.
*   **Color/Contrast Problems**: The page canvas is too white, making cards feel like they float awkwardly without boundary.
*   **Typography Problems**: Inconsistent font styles for column metrics.
*   **Responsive Problems**: Metric columns overlap or hide on mobile screens.
*   **Data-Display Problems**: Display of empty data is confusing to users.
*   **Exact Intended Redesign**:
    *   Introduce structured watch list groups.
    *   Use clear "Track company" and "Open research" indicators.
    *   Build a dedicated empty-state component that guides users directly to search or rankings.

---

## 7. Portfolio / Investments Page

*   **Current Visual Problems**: Looks like a retail trading dashboard, which conflicts with StockStory's research-only identity.
*   **Current Navigation Problems**: Intrusive buttons to mock buy/sell trades or connect a broker.
*   **Hierarchy Problems**: Focus is misplaced on total P&L rather than underlying data coverage of the held assets.
*   **Color/Contrast Problems**: Loud green and red percentages that look like a generic ticker.
*   **Typography Problems**: Large numbers dominate the page without clear labeling.
*   **Responsive Problems**: Spacing on tablet viewports stretches columns to unnatural lengths.
*   **Data-Display Problems**: Displays fake portfolio values or simulated assets.
*   **Exact Intended Redesign**:
    *   Refactor the page title to "Tracked Positions".
    *   Remove all broker-connect inputs, trading terminology, or buy/sell CTAs.
    *   Display manual-entered position metrics with transparent data source audits.

---

## 8. Trust Centre Page

*   **Current Visual Problems**: Flat, unstructured text blocks describing data providers.
*   **Current Navigation Problems**: Hard to find from the main dashboard context.
*   **Hierarchy Problems**: Fails to segment providers by status (Active, Degraded, Blocked, Archived).
*   **Color/Contrast Problems**: Status chips are misleading (e.g. Yahoo Finance marked green when degraded).
*   **Typography Problems**: Inconsistent mono fonts.
*   **Responsive Problems**: Grid structures break down on narrow mobile viewports.
*   **Data-Display Problems**: Active sources show incorrect scope (e.g. IndianAPI for fundamentals).
*   **Exact Intended Redesign**:
    *   Redesign into the primary "SSI Data Trust Centre".
    *   Build a structured Domain Provider Matrix showing current status:
        *   **Active Sources**: IndianAPI (Quotes), Jugaad Data (Partial Bhavcopy/RBI), NSEPython (Partial Index).
        *   **Partial/Manual**: Manual Fundamentals Import (CSV).
        *   **Blocked/Degraded**: Yahoo Finance.
        *   **Archived**: NSELib (Collapsed).
    *   Add a prominent policy section detailing: "No-advice policy & absolute data integrity standards."

---

## 9. About Page

*   **Current Visual Problems**: Long paragraphs that are dry and unreadable.
*   **Current Navigation Problems**: Hard to access from authenticated areas.
*   **Hierarchy Problems**: Editorial principles are buried at the bottom.
*   **Color/Contrast Problems**: Monochromatic text without structural layout lines.
*   **Typography Problems**: Standard sans-serif text without elegant line heights.
*   **Responsive Problems**: Unstructured reading columns on tablets and mobile screens.
*   **Data-Display Problems**: Lacks clear disclosures on data policies.
*   **Exact Intended Redesign**:
    *   Design a premium editorial layout with clear horizontal dividers.
    *   Clearly display the StockStory India manifesto, empirical research rules, and provider transparency standards.

---

## 10. Settings / Account Page

*   **Current Visual Problems**: Random buttons scattered on a single page.
*   **Current Navigation Problems**: Blends authentication and layout preferences confusingly.
*   **Hierarchy Problems**: Settings lack structured categories.
*   **Color/Contrast Problems**: Form inputs use stark backgrounds.
*   **Typography Problems**: Inputs lack placeholder styling.
*   **Responsive Problems**: Form layouts stretch to full width on widescreen screens.
*   **Exact Intended Redesign**:
    *   Divide the page into clear visual tiles: "Profile details", "Research inputs", and "Privacy & Data".
    *   Add links to the Trust Centre and data policy documents.

---

## 11. Sign-In / Sign-Up Pages

*   **Current Visual Problems**: Stark white inputs with harsh black borders; lacks premium fintech feel.
*   **Current Navigation Problems**: Back buttons overlap with screen titles.
*   **Hierarchy Problems**: Lacks brand visual anchor.
*   **Color/Contrast Problems**: Too much contrast; harsh input fields.
*   **Typography Problems**: Unpolished labels and error text.
*   **Responsive Problems**: Login boxes stretch full screen on tablet/desktop viewports.
*   **Exact Intended Redesign**:
    *   Create a centered, elegant auth container with subtle emerald details.
    *   Incorporate descriptive subtext explaining the login context.
