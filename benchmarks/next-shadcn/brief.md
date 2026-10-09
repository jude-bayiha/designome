# App brief: Cabinet

Cabinet is a fictional collections registry for a natural-history museum. Every arm builds the same five routes from this brief. The domain has nothing to do with the source screenshots on purpose: the product name, people, objects and numbers below belong to the benchmark, so every route tests whether a design grammar learned from other products transfers to a new one.

## Technical frame

- Use the Next.js App Router project in the current directory. It already contains Tailwind CSS, shadcn/ui components in `components/ui/`, `lucide-react` and `recharts`.
- Do not add, remove or upgrade dependencies.
- Keep the data in local TypeScript modules; there is no backend.
- All five routes share one app shell with primary navigation.
- `/` redirects to `/objects`.
- `npm run build` must succeed.

## Shared content

- **Museum:** Halden Museum of Natural History, collections department.
- **Signed-in user:** Ines Albrecht, registrar.
- **Staff:** Ines Albrecht, Rafael Okonkwo, Mei Tanaka, Tomás Varga, Priya Nair, Jonas Lindqvist.
- **Collections:** Minerals, Fossils, Insects, Herbarium, Birds.
- **Condition check statuses:** Due, In treatment, Cleared.
- **Risk levels:** Low, Medium, High, Critical.
- **Accession numbers:** `HM-` followed by the year and a four-digit number, such as `HM-2019-0412`.

Use initials, generic avatars or simple shapes for people and collection marks. Do not use photographs or third-party logos.

## Routes

### `/objects`

The condition-check register for the autumn survey, "Autumn survey · Oct 1 – Nov 14".

- A summary row with four figures: 1,284 objects in scope, 37 checks due this week, 5 objects in treatment, 82 % of the survey done.
- A table of objects grouped by condition check status, at least 16 objects spread across the five collections. Each row shows the object name with its accession number, the collection, one or two material tags (such as "mineral", "glass", "paper", "pinned", "skin"), the assigned conservator, the next check date, the risk level and when the record was last updated. Some objects have no next check date or no risk level yet.
- Filters for collection, conservator and risk level, plus a search field and a primary "Add object" action.

### `/loans`

Objects lent to and borrowed from partner institutions.

- Eight partner institutions, invented, each with its city, loan direction (Outgoing or Incoming), status (Active, Pending, Overdue), the number of objects on loan, the days remaining and the insured value.
- A way to narrow the list by direction and by status.
- A "New loan" action, and a per-institution control to pause automatic reminders.

### `/calendar`

October 2026 for the collections department.

- A month view with at least 12 events: two exhibition installs, one de-install, four courier visits, three conservation lab days and two days of leave.
- A side list of the next five upcoming events.
- Today is October 8, 2026.

### `/reporting`

Collection care metrics for the last 12 weeks.

- Four headline figures: 214 checks completed, 3.2 days median treatment time, 96 % of objects within environmental limits, 7 open incidents.
- A weekly chart of completed checks over 12 weeks.
- A breakdown of objects in scope by collection.
- A breakdown of open incidents by risk level.

### `/settings`

Department and personal settings.

- Sections for profile, department, notifications and integrations.
- At least one text field, one select, two toggles and a destructive action ("Archive collection") with a confirmation pattern.
- Save and cancel actions.
