# Basic Teacher Dashboard (React + TypeScript + Vite)

Every Portal. Every Update. One Dashboard.
भारत के बेसिक शिक्षकों के लिए बनाया गया ऑल-इन-वन स्मार्ट वर्कस्पेस।

## Overview

This repository has been rewritten into a modern, responsive React + TypeScript Single Page Application (SPA) powered by Vite.

### Core Features Preserved & Ported:
1. **Landing & Overview (`/`)**:
   - Hero section with live interactive preview, floating 3D icons, and trust badges.
   - Animated statistics counter (34+ Portals, 6 Categories, 100% Free Forever, 2 Languages).
   - 6 Core features showcase, 3-step onboarding guide, real teacher testimonials, and transparent pricing & FAQ.
2. **Main Dashboard (`#dashboard`)**:
   - Personalized greeting ("नमस्ते, [शिक्षक नाम]!") with real-time Hindi date display.
   - **WhatsApp & YouTube Action Cards**: Census 2027 Phase 2 Trainer WhatsApp Group access with one-click invite copy, YouTube training channel launcher and channel configuration.
   - **Smart Workspace**: Embedded WhatsApp Web link hub & interactive YouTube video player with URL parser (supports shorts, watch, youtu.be, live) and browser memory.
   - **Live Notice Board**: Pinned and new government updates with badges.
   - **Government Portal Directory**: 34+ portals across 6 categories (सीखना और प्रशिक्षण, विद्यालय प्रबंधन, रजिस्टर, शिक्षक सेवा व स्वास्थ्य, परीक्षा व प्रतियोगिता, अभियान व सर्वेक्षण) with real-time search and category filtering.
   - **Teacher Tools**: To-Do list with task completion toggle/deletion and auto-saving live Notepad.
3. **School Sheets (`#sheets`)**:
   - MDM Sheet, Daily Attendance/Absence Sheet, and Result Sheet.
   - Real-time auto-calculation of percentage, grades (A+, A, B, C, D, E), and pass/fail indicators.
   - CSV Export with UTF-8 BOM encoding for seamless Excel Hindi support.
   - Printer-friendly layout with print-specific stylesheet overrides.
   - Live summary metrics cards.
4. **Authentication & Cloud Sync (`#login`)**:
   - Supabase client integration with real-time service health check.
   - Login and Signup with password strength analysis and password visibility toggles.
   - Local storage fallback for offline support.
5. **Theme Support**:
   - Light and dark themes with glassmorphism visual design tokens and instant persistence.

## Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`.
