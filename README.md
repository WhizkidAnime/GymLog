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

## 1. Supabase Setup

1.  **Create a Supabase Project:**
    - Go to [supabase.com](https://supabase.com) and create a new project.
    - Save your **Project URL** and **`anon` (public) key**.

2.  **Run the Database Schema SQL:**
    - In your Supabase project dashboard, navigate to the **SQL Editor**.
    - Click **+ New query**.
    - Copy the entire content of the SQL schema provided in the initial prompt and paste it into the editor.
    - Click **Run**. This will create all the necessary tables and enable Row Level Security (RLS) policies.

3.  **Configure Authentication:**
    - Go to **Authentication -> Providers**.
    - Enable the **Email** provider.
    - **Disable "Confirm email"** to allow users to log in instantly via Magic Link without a confirmation step.
    - Go to **Authentication -> URL Configuration**.
    - Set your **Site URL**. This will be the URL where your application is running.

## 2. Local Setup & Environment Variables

This project requires environment variables to connect to your Supabase instance.

1. **Environment Variables (Vite):**
   - Создайте файл `.env` в корне проекта и укажите переменные окружения с префиксом `VITE_`:
     ```
     VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
     VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
     ```
   - Значения возьмите в Supabase: **Project Settings → API**.

2. **Install Dependencies (if running locally):**
    ```bash
    npm install
    ```
    
3. **Run the Project (if running locally):**
    ```bash
    npm run dev
    ```

## 3. How to Install as a PWA on iPhone

1.  **Open in Safari:** Navigate to your deployed application's URL using the Safari browser on your iPhone.
2.  **Tap the Share Icon:** Tap the "Share" button (the square icon with an arrow pointing up) in the bottom navigation bar.
3.  **Select "Add to Home Screen":** Scroll down the share sheet and tap on "Add to Home Screen".
4.  **Confirm:** You can rename the app if you wish, then tap "Add" in the top-right corner.
5.  **Launch from Home Screen:** The app icon will now appear on your home screen. Tapping it will launch the app in a standalone, fullscreen window without the Safari UI.