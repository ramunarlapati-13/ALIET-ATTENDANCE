# 🎓 ALIETAKE - Advanced College Management System

A state-of-the-art, high-performance web application designed for comprehensive college management. Built with **Next.js 14**, **Firebase Hub**, and **Tailwind CSS**, it provides seamless attendance tracking, academic monitoring, and administrative control with a focus on premium aesthetics and institutional efficiency.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 | App Router, SSR, Optimization |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS | Utility-first CSS, Dark/Light modes |
| **Database** | Firestore & RTDB | Hybrid persistent & real-time sync |
| **Auth** | Firebase Auth | Secure multi-role authentication |
| **Analytics** | Recharts | Dynamic data visualization & charting |
| **Charts** | html2canvas | Graph-to-image export utility |
| **Reporting** | jsPDF / xlsx | Professional PDF & Excel export tools |
| **State** | Zustand / Context | Global state & local provider management |
| **Icons** | Lucide React | Modern vector icons |
| **PWA** | Next-PWA | Desktop/Mobile installation & offline mode |

---

## 📂 Project Structure

```text
ALIET-ATTENDANCE/
├── app/                        # Next.js App Router
│   ├── api/                    # Serverless route handlers
│   ├── dashboard/              # Role-specific portals
│   │   ├── admin/              # Master Management & Analytics
│   │   ├── faculty/            # Attendance Marking & Dept Feed
│   │   └── student/            # Attendance Tracks & Profile
│   ├── login/                  # Clean entry portal
│   ├── register/               # Multi-step student onboarding
│   ├── register-faculty/       # Administrative faculty registration
│   ├── import-students/        # Bulk ingestion tools
│   ├── globals.css             # Global styles & Pencil Animations
│   └── layout.tsx              # Root layout with Global context
├── components/                 # Reusable Component Library
│   ├── ui/                     # Core UI elements (Pencil Loader, Buttons, etc.)
│   ├── auth/                   # Protected routes & role wrappers
│   └── announcements/          # Notification ticker systems
├── context/                    # React Context Providers
│   ├── AuthContext.tsx         # Firebase user & session management
│   └── ThemeContext.tsx        # Dynamic Dark/Light mode engine
├── data/                       # Local JSON Registries
│   └── students.json           # Master EEE enrollment reference
├── lib/                        # Configuration & Core SDKs
│   └── firebase/               # Firebase Admin & Client config
├── types/                      # Global TypeScript interfaces
└── utils/                      # Business logic & date helpers
```

---

## 🧱 Key UI Components

### ✏️ Signature Pencil Loader
A custom, branded animation used throughout the application to signify loading states.
- **`loader-1.tsx`**: The core SVG animation component with multi-size `scale` support.
- **`GlobalPencilLoader.tsx`**: A full-screen overlay integrated into the root layout with **Backdrop Blur** and tracking-transition effects.
- **`LoadingBar.tsx`**: A top-mounted progress bar for route transitions.

### 🌓 Theme Engine
- **`ThemeToggleFloating.tsx`**: A sleek icon-based switcher for Dark/Light modes.
- **Custom Utility Styles**: Integrated dark mode support for all charts, tables, and dashboards.

### 🖱️ Experience Tools
- **`SpotlightCursor.tsx`**: An interactive light-follow effect for the Admin Dashboard.
- **`NavigationDock.tsx`**: A premium mobile-responsive floating navigation bar.
- **`Skeleton.tsx`**: Shimmer-effect placeholders for optimistic data loading.

---

## 🚀 Core Features

### 📅 Advanced Attendance Engine
- **Lateral Entry Intelligence**: Automatically calculates academic year based on registration number patterns.
- **Real-Time Sync**: RTDB integration ensures attendance marked by faculty reflects instantly in HOD/Admin views.
- **Audit Logging**: Tracks every sign-in and attendance change in the `logs` collection.

### 📊 Admin Control Center
- **Interactive Branch Cards**: Click any branch (CSE, EEE, etc.) to view live enrollment.
- **Year-Wise Breakdown**: Detailed visibility of students across 1st, 2nd, 3rd, and 4th Year.
- **Master Registry Check**: Cross-references Firestore data with `students.json` to identify un-registered students.

### 📈 Analytics & Reporting
- **Multi-Format Export**: Generate professional reports in **PDF**, **Excel**, or **CSV**.
- **Visual Trends**: Performance charting for branches and individual student attendance.
- **Data Ingestion**: Support for bulk student uploads via CSV/Excel using PapaParse and XLSX.

---

## 🏁 Development Setup

1. **Install Dependencies**: `npm install`
2. **Setup Env**: Copy `.env.example` to `.env.local` and add Firebase credentials.
3. **Launch**: `npm run dev`
4. **Build PWA**: `npm run build`

---

© 2026 **ALIET College**. Designed for Excellence.

