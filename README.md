# DDU School of Computing – Exam Schedule

Next.js 16 + Tailwind 4. Run: `pnpm install && pnpm dev`. Deploys to Vercel/Netlify as-is.

## Office mode (editing)
Click **Office login** (default PIN `1234`; change it in Manage → Settings & data).
- **Schedule page**: add / edit / delete exams, assign invigilators, set a result per exam and press **Save** (or **Save all**).
  When every exam has a recorded result, the schedule status becomes **Completed** automatically.
- **Reports** (open to everyone): dashboard by department (completed / missed / late / not updated), then a report you can filter by schedule, department, status, invigilator, date range and course name/code, group by department/status/date/invigilator, and export as CSV (opens in Excel) or print / save as PDF.
- **Manage → Schedules**: add schedules for any exam period or academic year (duplicate copies exams with results reset).
- **Manage → Import exams**: upload an Excel (.xlsx) or CSV timetable into a new schedule (any academic year + semester) or add to an existing one. Preview first, then confirm. Merged/blank Department, Batch and Room cells are filled down automatically; unknown departments are created. A template can be downloaded.
- **Manage → Departments & contacts**: department head name, phone, email and notes per department (add more any time).
- **Manage → Invigilators**: staff list used for assignment.
- **Manage → Settings & data**: university/school names, **Dean** and **Registrar** name/phone/email, PIN, Export / Import JSON backup.

## Where is data stored?
In the browser (localStorage), so edits are visible on the device that made them. To publish edits to all visitors,
Export JSON, paste it over `seedDB` in `lib/seed.ts` and redeploy — or connect a shared database (Supabase/Firebase).
The PIN is an interface lock only; use real authentication once data lives on a server.

Key files: `lib/seed.ts` (starting data) · `lib/store.tsx` (state + persistence) · `components/` (UI) · `public/logo.png` (seal).
