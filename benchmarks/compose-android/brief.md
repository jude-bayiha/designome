# App brief: Plotline

Plotline is a fictional Android app for a community garden. Every arm builds the same eight screens from this brief. The domain has nothing to do with the source screenshots on purpose: the product name, people, crops and numbers below belong to the benchmark, so every screen tests whether a design grammar learned from other products transfers to a new one.

## Technical frame

- Use the Kotlin and Jetpack Compose project in the current directory. It already contains Material 3, Navigation Compose and the screenshot-test setup.
- Do not add, remove or upgrade dependencies.
- Keep the data in local Kotlin objects; there is no backend.
- One `NavHost` holds every screen. Screens 1, 3, 7 and 8 are top-level destinations reachable from one primary navigation; the others open from them and offer a back affordance.
- Every screen is a stateless composable that takes its data as parameters, so a screenshot test can render it.
- `./gradlew assembleDebug` must succeed.

## Shared content

- **Garden:** Linden Street Community Garden, 24 plots.
- **Signed-in member:** Mei Tanaka, plot B4.
- **Other members:** Rafael Okonkwo, Ines Albrecht, Tomás Varga, Priya Nair.
- **Season:** 2026 summer season. Today is October 8, 2026. Weights are in kilograms, volumes in liters.
- **Beds:** North beds, South beds, Greenhouse.
- **Crops:** Tomatoes, Courgettes, Beans, Kale, Strawberries, Herbs.

Use initials, simple shapes or generic crop marks on colored tiles. Do not use photographs or third-party logos.

## Screens

### 1. Home

The garden this week.

- Headline figure: 412.6 kg harvested this season, against a goal of 500 kg; 18 of 24 plots active.
- Three notices, each with a short explanation: "Frost expected Saturday night", "Compost delivery on October 12", "2 plots missed watering this week".
- A primary action to review the notices and a secondary action.

### 2. Harvest by crop

What the garden produced this season.

- A chart of the six crops: Tomatoes 148.2 kg, Courgettes 96.4 kg, Beans 61.8 kg, Kale 44.5 kg, Strawberries 33.9 kg, Herbs 27.8 kg.
- A legend or labels that tie every value to its crop.
- A comparison with the 2025 season for the selected crop: Tomatoes 131.0 kg in 2025.

### 3. Plots

All plots of the garden.

- Three tabs: Active 18, Resting 4, Waitlist 2, each with its count.
- A one-line share-by-bed summary for the active plots.
- A sort control ("Plot number" by default) and a search action.
- The active plots grouped by bed, with a per-bed harvest subtotal; each row shows plot number, keeper, main crop, last watering and season harvest. At least one row carries a warning state ("Not watered for 6 days").

### 4. Plot detail

Plot B4, kept by Mei Tanaka, in the South beds.

- Keeper, bed, size (12 m²), main crop (Tomatoes) and next shared work shift (October 14).
- A weekly harvest history over the last 12 weeks with two peaks.
- Watering record for the last 28 days: watered on 24 days, missed 4.
- Actions to log a harvest and to hand the plot over.

### 5. Compare varieties

Two tomato varieties grown on plot B4.

- The two varieties side by side with yield per plant, days to first harvest and one key trait each; the variety planted this season is marked.
- An explanation block ("Why we suggest it") with the expected extra yield: 3.8 kg per season.
- A short list of other suggestions with one dismissed item.
- Two actions: keep the current variety, or switch next season.

### 6. Log a planting

A form to record a new planting.

- Crop (select), variety (text), plot (select), bed (select), sowing date (date), quantity (number of plants), watering cadence (segmented choice: daily, every 2 days, weekly).
- A toggle for a watering reminder.
- Inline validation on the quantity, and save and cancel actions.

### 7. Season goals

Three shared goals with progress.

- Harvest 500 kg: 412.6 kg so far.
- Donate 120 kg to the food bank: 86 kg so far, target October 31.
- Compost 2,000 liters: 1,540 liters so far, no target date.
- An action to add a goal.

### 8. Settings

Member and garden settings.

- Sections for profile, plot sharing, notifications and data export.
- At least two toggles, one select and a destructive action ("Give up my plot") with a confirmation pattern.
