# Teacher Hub — Basic Teacher Dashboard (बेसिक शिक्षक डैशबोर्ड)

**One Teacher, One Dashboard** — An offline-first, bilingual (Hindi + English) daily workflow, compliance, and classroom management hub built for Government Primary & Composite School teachers (*Basic Shiksha Parishad*).

---

## 🚀 Quick Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server (Port 3000)**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000/#dashboard` in your browser.

3. **Run Unit Tests (`node:test` — 149 Tests Across 11 Suites)**
   ```bash
   npm test
   ```

4. **Production Build & Type-Check**
   ```bash
   npm run lint
   npm run build
   ```

5. **Cloudflare Pages / Static Hosting Deployment (`basic-teacher-dashboard.pages.dev`)**
   - **Recommended Cloudflare Pages Build Settings**:
     - **Framework preset**: `Vite`
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - **Built-in Root Auto-Fallback (White Screen Prevention)**:
     - If Cloudflare Pages or any static server serves the repository root `/` directly instead of `dist/` (where `/src/main.tsx` returns `application/octet-stream`), `index.html` automatically detects the uncompiled `.tsx` error and loads the pre-compiled production bundle from `/static-build/app.js` and `/static-build/app.css`.

---

## 🎯 1. Demo Teacher Profile & Realistic Sample Data

Click **"🎯 डेमो प्रोफ़ाइल व QA परीक्षण"** in the Teacher Hub banner to load the pre-configured profile for **श्री राजेश कुमार शर्मा (Rajesh Kumar Sharma)** — *सहायक अध्यापक (PRT), प्राथमिक विद्यालय (कंपोजिट) मॉडल, गोमती नगर, लखनऊ (`UDISE+: 09260101204`, Session `2026-27`)*:

- **2 School Sections**:
  1. `कक्षा 4 - Section A`: गणित एवं पर्यावरण अध्ययन (Mathematics & EVS) — 6 students (DPDP minimal schema: Roll No, Name, Gender) & timetable slots.
  2. `कक्षा 5 - Section B`: हिंदी भाषा एवं व्यावहारिक गणित (Hindi & Applied Math) — 6 students & timetable slots.
- **10 Tasks**: Realistic tasks spanning `Overdue` (>3 days Critical Escalation), `In Progress`, `Not Started`, `Pending Approval`, `Done`, and recurring schedules (`daily`, `weekly`, `monthly`, `yearly`).
- **3 Portals**:
  1. **Prerna Portal UP** (`https://prernaup.in`)
  2. **UDISE+ SDMS Portal** (`https://udiseplus.gov.in`)
  3. **Manav Sampada eHRMS** (`https://ehrms.upsdc.gov.in`)
- **4 Govt Orders**: Covers all 4 filter states (`New`, `Action Needed`, `Acknowledged`, `Expired`) with 1-click Task conversion and timestamped acknowledgement.
- **2 Meetings**:
  1. *मासिक अभिभावक-शिक्षक एवं SMC बैठक* (Offline, School Hall)
  2. *संकुल शिक्षक (NPRC/ARP) मासिक निपुण लक्ष्य समीक्षा बैठक* (Online)
- **2 Trainings**:
  1. *निपुण भारत FLN 3.0 (DIKSHA)* — In-progress (67%, nearing deadline warning)
  2. *साइबर स्वच्छता एवं DPDP Act 2023 छात्र डेटा सुरक्षा प्रशिक्षण (SCERT)* — Completed (100% with certificate)
- **3 Duties**:
  1. *मध्याह्न भोजन (MDM) चखना एवं वितरण पर्यवेक्षण* (Mon–Sat)
  2. *प्रातःकालीन प्रार्थना सभा एवं स्वच्छता निरीक्षण ड्यूटी* (Mon, Wed, Fri)
  3. *पुस्तकालय एवं रीडिंग कॉर्नर संचालन ड्यूटी* (Tue, Thu, Sat)

---

## ✅ 2. QA Test Checklist

Open **"🎯 डेमो प्रोफ़ाइल व QA परीक्षण" → Tab 2 ("परीक्षण सूची")** to run live automated self-tests or verify manually:

1. **Status Changes**: Transition a task (`Not Started` → `In Progress` → `Done`); verify `completedAt` timestamp and immutable `StatusLog` audit trail entries.
2. **Overdue Logic**: Verify non-done tasks with past deadlines automatically transition to `Overdue` on load, and tasks overdue by `> 3 days` trigger the red **Critical Escalation** banner.
3. **Recurring Tasks**: Mark a `Daily`, `Weekly`, `Monthly`, or `Yearly` recurring task as `Done`; verify the next cycle task instance is automatically generated.
4. **Reminders**: Open **🔔 Alerts (Notification Center)** to verify the 4 rules (`3 days before`, `1 day before`, `same day morning`, `overdue daily`), channel toggles (In-App, Browser Push, Mock WhatsApp/SMS adapter), and **Snooze (1h / Tomorrow)** / **Dismiss**.
5. **Annual Session Rollover**: Open **🔄 Rollover** (`2026-27` → `2027-28`), promote students across sections, select carry-over tasks/portals/duties, search the read-only archive, and verify the **7-day reversible rollback**.
6. **Offline Usage & DPDP Guard**: Export/import a full local **JSON Backup**, reload the app offline, and verify that entering any 12-digit **Aadhaar number** or **password** in text fields is actively blocked under **DPDP Act 2023**.

---

## ♿ 3. Accessibility Check (WCAG 2.1 AA/AAA)

Open **"♿ A+ फ़ॉन्ट व सुगम्यता"** in the Teacher Hub bar to configure:

- **Large Fonts**: Instant root font scaling (`A 100%`, `A+ 112.5%`, `A++ 125%`) with `48px+` touch targets for comfortable Devanagari and English reading.
- **Color Contrast**: High-contrast ratios (`>= 7.2:1`), dedicated **High Contrast Mode (`उच्च कंट्रास्ट मोड`)** toggle for outdoor/bright-sunlight school use, and non-color redundancy (icons + bilingual badges on every status).
- **Screen Reader Labels**: Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), `role="dialog"`, `aria-modal="true"`, `aria-live="polite"` toast regions, and descriptive `aria-label` attributes on icon controls.
