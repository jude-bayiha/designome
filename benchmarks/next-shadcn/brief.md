# App brief: Relay

Relay is a fictional project-management web app. Every arm builds the same five routes from this brief. The product name, people, projects and numbers below belong to the benchmark, not to any source screenshot, so every screen tests whether a design grammar transfers to new content.

## Technical frame

- Use the Next.js App Router project in the current directory. It already contains Tailwind CSS, shadcn/ui components in `components/ui/`, `lucide-react` and `recharts`.
- Do not add, remove or upgrade dependencies.
- Keep the data in local TypeScript modules; there is no backend.
- All five routes share one app shell with primary navigation.
- `/` redirects to `/tasks`.
- `npm run build` must succeed.

## Shared content

- **Workspace:** Relay, owned by the team "Harbor Studio".
- **Signed-in user:** Noor Haddad, product lead.
- **People:** Noor Haddad, Tomasz Wiśniewski, Amara Okafor, Lucía Fernández, Kenji Watanabe, Priya Raman, Elias Berg, Sofia Marchetti.
- **Projects:** Atlas Redesign, Billing Migration, Mobile Onboarding, Partner Portal, Data Retention.
- **Task statuses:** Backlog, In progress, In review, Done.
- **Priorities:** Low, Medium, High, Urgent.

Use initials, generic avatars or simple shapes for people and project marks. Do not use photographs or third-party logos.

## Routes

### `/tasks`

The task workspace for the current sprint, "Sprint 14 · Oct 6 – Oct 17".

- A summary row with four figures: 48 open tasks, 9 due this week, 6 overdue, 71 % sprint completion.
- A task list or board grouped by status, at least 16 tasks spread across the five projects, with assignee, project, due date and priority.
- Filters for project, assignee and priority, plus a search field and a primary "New task" action.

### `/team`

The members of Harbor Studio.

- One entry per person with role, current workload (open tasks, between 2 and 14) and availability (Available, Busy, Out of office).
- A small capacity overview: total open tasks per person for the sprint.
- An "Invite member" action.

### `/calendar`

October 2026 for the team.

- A month view with at least 12 events: sprint ceremonies, project milestones, two release dates and three days of leave.
- A side list of the next five upcoming events.
- Today is October 8, 2026.

### `/reporting`

Delivery metrics for the last 12 weeks.

- Four headline figures: cycle time 3.4 days, throughput 37 tasks per week, 92 % on-time delivery, 4 blocked tasks.
- A weekly throughput chart over 12 weeks.
- A breakdown of open tasks by project.
- A breakdown of completed tasks by status or priority.

### `/settings`

Workspace and personal settings.

- Sections for profile, workspace, notifications and integrations.
- At least one text field, one select, two toggles and a destructive action ("Delete workspace") with a confirmation pattern.
- Save and cancel actions.
