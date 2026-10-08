# App brief: Tally

Tally is a fictional household-budget Android app. Every arm builds the same eight screens from this brief. The product name, people, providers and numbers below belong to the benchmark, not to any source screenshot, so every screen tests whether a design grammar transfers to new content.

## Technical frame

- Use the Kotlin and Jetpack Compose project in the current directory. It already contains Material 3, Navigation Compose and the screenshot-test setup.
- Do not add, remove or upgrade dependencies.
- Keep the data in local Kotlin objects; there is no backend.
- One `NavHost` holds every screen. Screens 1, 3, 7 and 8 are top-level destinations reachable from one primary navigation; the others open from them and offer a back affordance.
- Every screen is a stateless composable that takes its data as parameters, so a screenshot test can render it.
- `./gradlew assembleDebug` must succeed.

## Shared content

- **Household:** the Okafor-Lindqvist home, two members.
- **Signed-in user:** Amara Okafor.
- **Other member:** Jonas Lindqvist.
- **Month:** October 2026. Today is October 8, 2026. Currency is euro.
- **Accounts:** Nordbank checking, Joint card.
- **Bill groups:** Housing, Energy, Telecom, Insurance, Transport, Leisure.

Use initials or simple shapes on colored tiles for providers. Do not use photographs or third-party logos.

## Screens

### 1. Home

The month at a glance.

- Headline figure: €2,148.60 spent of a €2,600 budget, 11 bills paid of 17.
- Three highlights, each with a short explanation: "Energy is 18 % above September", "Car insurance renews in 9 days", "2 bills paid twice this month".
- A primary action to review the highlights and a secondary action.

### 2. Spending by group

Where October's money went.

- A chart of the six bill groups: Housing €980.00, Energy €214.35, Telecom €96.80, Insurance €182.40, Transport €141.20, Leisure €73.85.
- A legend or labels that tie every value to its group.
- A comparison with September for the selected group.

### 3. Bills

All recurring bills of the household.

- Three tabs: Active 17, Paused 2, Ended 5, each with its count.
- A one-line share-by-group summary for the active bills.
- A sort control ("Next due" by default) and a search action.
- The active bills grouped by bill group, with a per-group subtotal; each row shows provider, cadence, next due date, account and amount. At least one row carries a warning state ("Paid twice?").

### 4. Bill detail

One bill: Volta Energy, €71.45 a month, paid from Nordbank checking.

- Provider, cadence, next due date (October 21), account and owner (Jonas).
- A price history over 12 months with two increases: €64.90 until March, €68.20 from April, €71.45 from August.
- Payment record for the last 12 months: 11 paid on time, 1 paid 4 days late in June.
- Actions to pause the bill and to mark it as disputed.

### 5. Compare plans

Volta Energy against Brisa Power.

- The two plans side by side with price, contract end and one key term each; the current plan is marked.
- An explanation block ("Why we suggest it") with the yearly saving: €118.20.
- A short list of other suggestions with one dismissed item.
- Two actions: keep the current plan, or switch.

### 6. Add a bill

A form to add a recurring bill.

- Provider name (text), amount (number), cadence (select: weekly, monthly, quarterly, yearly), first due date (date), account (select), group (select), owner (segmented choice: Amara, Jonas, shared).
- A toggle for a reminder two days before the due date.
- Inline validation on the amount, and save and cancel actions.

### 7. Savings goals

Three goals with progress.

- Summer trip: €1,240 of €2,000, target June 2027.
- New laptop: €610 of €1,400, target March 2027.
- Emergency fund: €4,800 of €6,000, no target date.
- An action to add a goal.

### 8. Settings

Household and personal settings.

- Sections for profile, household members, notifications and data export.
- At least two toggles, one select and a destructive action ("Leave household") with a confirmation pattern.
