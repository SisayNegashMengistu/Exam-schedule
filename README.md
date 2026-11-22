# DDU School of Computing – Exam Schedule

Next.js 16 + Tailwind 4. Run: `pnpm install && pnpm dev`. Deploys to Vercel/Netlify as-is.

## Office mode (editing)
Click **Office login** (default PIN `1234`; change it in Manage → Settings & data).
- **Schedule page**: add / edit / delete exams, assign invigilators, set a result per exam and press **Save** (or **Save all**).
  When every exam has a recorded result, the schedule status becomes **Completed** automatically.
- **Reports** (open to everyone): dashboard by department (completed / missed / late / not updated), then a report you can filter by schedule, department, status, invigilator, date range and course name/code, group by department/status/date/invigilator, and export as CSV (opens in Excel) or print / save as PDF.
- **Manage → Schedules**: add schedules for any exam period or academic year (duplicate copies exams with results reset).
- **Manage → Import exams**: upload an Excel (.xlsx) or CSV timetable into a new schedule (any academic year + semester) or add to an existing one. Preview first, then confirm. Merged/blank Department, Batch and Room cells are filled down automatically; unknown departments are created. A template can be downloaded.
- **Manage → Semesters**: add the terms you use — 1st Semester, 2nd Semester, 3rd Semester (Summer) are created by default. Schedules and course breakdowns pick from this list; renaming a semester updates the schedules that use it.
- **Manage → Course breakdown**: choose **Department → Batch → Semester**, then upload that department's course-breakdown **PDF**. The PDF can hold one table or every year/semester (headings such as “YEAR II SEMESTER I”): choose one section to save into the selected batch/semester, or *All sections* to create a breakdown for each year & semester at once. Columns read: Course Code, Title, ECTS, Cr. Hrs, Lec/Lab/Tut hrs, HS, Pre-request, Course Assigned To. After saving, every field is editable, courses can be added/removed, and each course gets an **instructor** drop-down. The same table shows the exam date and invigilators of the selected schedule for each course.
- **Manage → Instructors**: teaching staff. **Upload a CSV / Excel list** (Name, Phone, Department; template included) or add one by one — existing names are updated, not duplicated. Names found in a breakdown (“Shimels H.”) are matched to existing instructors or added automatically; rename them here for full names. Invigilators stay a separate list.
- **Assign invigilators**: has a department filter and, under every course, an **Instructor drop-down**. Picking one saves it to that course in the Course breakdown (the course is added to the right department/batch/semester breakdown if it isn't there yet). It also warns when the instructor is also chosen as an invigilator.
- **Manage → Departments & contacts**: department head name, phone, email and notes per department (add more any time).
- **Manage → Invigilators**: staff list used for assignment.
- **Manage → Settings & data**: university/school names, **Dean** and **Registrar** name/phone/email, PIN, Export / Import JSON backup.

## Where is data stored?
In the browser (localStorage), so edits are visible on the device that made them. To publish edits to all visitors,
Export JSON, paste it over `seedDB` in `lib/seed.ts` and redeploy — or connect a shared database (Supabase/Firebase).
The PIN is an interface lock only; use real authentication once data lives on a server.

PDF reading runs in the browser with `pdfjs-dist`; the worker file is copied to `public/pdf.worker.min.mjs` by `scripts/copy-pdf-worker.mjs` (runs on `postinstall`). Text-based PDFs only — scanned images are not supported. Parser: `lib/breakdown.ts`.

Key files: `lib/seed.ts` (starting data) · `lib/store.tsx` (state + persistence) · `lib/breakdown.ts` (PDF → courses) · `components/breakdown-panel.tsx` (course breakdown UI) · `components/` (UI) · `public/logo.png` (seal).
