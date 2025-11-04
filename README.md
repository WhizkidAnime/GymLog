# GymLog PWA

A progressive web application for tracking workouts, built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Workout Templates:** Create reusable workout plans.
- **Calendar Scheduling:** Assign templates to specific dates.
- **Real-time Logging:** Track sets, reps, and weight for each exercise.
- **Auto-Saving:** All progress is automatically saved to Supabase in real-time.
- **Rest Timers:** Integrated timers for each exercise.
- **PWA Ready:** Fully installable on iOS and Android for a native-like experience.
- **Secure:** Uses Supabase Auth with Row Level Security.
- **NO LocalStorage:** All user data is stored securely in your Supabase database.

## Tech Stack

- **Frontend:** React 18, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Routing:** React Router (HashRouter)

## How to Install as a PWA on iPhone

1.  **Open in Safari:** Navigate to your deployed application's URL using the Safari browser on your iPhone.
2.  **Tap the Share Icon:** Tap the "Share" button (the square icon with an arrow pointing up) in the bottom navigation bar.
3.  **Select "Add to Home Screen":** Scroll down the share sheet and tap on "Add to Home Screen".
4.  **Confirm:** You can rename the app if you wish, then tap "Add" in the top-right corner.
5.  **Launch from Home Screen:** The app icon will now appear on your home screen. Tapping it will launch the app in a standalone, fullscreen window without the Safari UI.