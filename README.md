# ALIETAKE College Management System

A comprehensive web application for college attendance tracking, academic performance monitoring, and fee management with role-based access control.

## Features

- **Multi-Role Authentication**: Student, Faculty, HOD, and Admin roles with Google OAuth support
- **Attendance Management**: Real-time attendance marking with automated EOD migration
- **Academic Records**: Marks entry and performance tracking
- **Fee Management**: Fee tracking and payment history
- **Dual-Tier Announcements**: Institutional and departmental announcements
- **Analytics Dashboards**: Role-specific dashboards with data visualization
- **Profile Rating System**: User feedback and rating functionality

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Realtime Database + Cloud Functions)
- **Authentication**: Firebase Auth (Google OAuth + Email/Password)
- **Charts**: Recharts
- **State Management**: React Context API + Zustand

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project created
- Firebase CLI installed (`npm install -g firebase-tools`)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ALIET-ATTENDANCE
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase configuration values

4. Deploy Firestore and Realtime Database rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only database
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
ALIET-ATTENDANCE/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/         # Role-specific dashboards
│   │   ├── student/
│   │   ├── faculty/
│   │   ├── hod/
│   │   └── admin/
│   └── api/               # API routes
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── attendance/       # Attendance components
│   ├── analytics/        # Analytics components
│   └── announcements/    # Announcement components
├── context/              # React context providers
├── lib/                  # Utility functions and Firebase config
├── types/                # TypeScript type definitions
├── firestore.rules       # Firestore security rules
└── database.rules.json   # Realtime Database security rules
```

## User Roles

### Student
- View personal attendance, marks, and fees
- View announcements
- Update profile

### Faculty
- Mark attendance for classes
- Enter marks for students
- View class-wise data
- Create departmental announcements (if HOD)

### HOD (Head of Department)
- All faculty permissions
- View department-wide analytics
- Manage departmental announcements
- Oversee faculty performance

### Admin
- Full system authority
- Institutional-level analytics
- Manage all users and data
- Create institutional announcements
- Fee management

## Firebase Setup

### Firestore Collections

- `users`: User profiles and roles
- `departments`: Department information
- `attendance/{date}`: Archived attendance records
- `academic_records`: Student marks and performance
- `finance`: Fee records and payment history
- `announcements`: Institutional and departmental announcements
- `ratings`: User ratings and feedback
- `class_sections`: Class/section assignments

### Realtime Database Structure

```
daily_attendance/
  {date}/
    {branch}/
      {section}/
        {year}/
          students/
            {studentId}/
              name: string
              registrationNumber: string
              status: "present" | "absent" | "late"
              markedBy: string
              timestamp: number
```

## Deployment

1. Build the production bundle:
```bash
npm run build
```

2. Deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

## Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
```

## License

© 2026 ALIET College. All rights reserved.
