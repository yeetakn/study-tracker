# Study Tracker

A client-side web application for tracking YKS exam preparation. Record study sessions, organize subjects, review study history, and generate reports.

**Languages:** [English](README.md) | [Türkçe](README.tr.md)

## Features

- **Dashboard:** Review study activity and summary statistics.
- **Study Records:** Create, edit, and delete study sessions.
- **Calendar:** Browse study history by date.
- **Subject Management:** Add, rename, and delete subjects.
- **Reports:** Generate daily, weekly, biweekly, monthly, and custom date-range reports.
- **PDF Export:** Export study reports as PDF documents.
- **Data Backup:** Export application data to JSON.
- **Data Restore:** Import data from a JSON backup.
- **Data Reset:** Reset local application data after explicit confirmation.

## Technology Stack

- **React** — user interface
- **TypeScript** — static type checking
- **Vite** — development server and build tooling
- **Tailwind CSS** — styling
- **IndexedDB** — client-side data persistence
- **idb** — IndexedDB API wrapper
- **jsPDF** and **jspdf-autotable** — PDF generation
- **date-fns** — date manipulation
- **lucide-react** — icons

## Requirements

- Node.js (LTS recommended)
- npm

Git is optional and only required if you intend to clone the repository.

The application can be developed on Windows, Linux, or macOS.

## Installation

### 1. Open the project directory

Open a terminal in the project root directory.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open the local URL displayed in the terminal. The default Vite development URL is usually `http://localhost:5173`.

### Windows PowerShell

If PowerShell prevents `npm.ps1` from running because of the current execution policy, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
```

This is a PowerShell-specific workaround, not a Windows requirement for the application.

## Build and Preview

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run these commands from the project root directory.

## Data Storage

Study records and subject information are stored locally in the browser using IndexedDB.

- No account or remote server is required for local use.
- Data is not automatically synchronized between devices or browsers.
- Clearing the browser's site data may permanently delete locally stored records.
- JSON backup and restore can be used to transfer data between environments.
- Regular backups are recommended before resetting data or changing devices.

After restoring a backup, verify that the expected records and subjects are available.

## Project Structure

```text
study-tracker/
├── public/
│   └── fonts/          # Fonts used in PDF output
├── src/
│   ├── components/     # Shared UI components
│   ├── db/             # Database operations
│   ├── pages/          # Application pages
│   ├── services/       # Backup and utility services
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── README.tr.md
```

## Scope and Limitations

Study Tracker is a client-side application that uses browser storage. The current version does not include user accounts, cloud synchronization, or a remote database.

Each browser maintains its own local data store. To move data to another browser or device, export a JSON backup and restore it in the target environment.

## Development

Install dependencies before starting the development server or creating a production build.

After making significant changes, run the production build to verify that the application compiles successfully.

Keep the dependency manifest and lockfile synchronized when adding or removing packages.