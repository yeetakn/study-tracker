# Study Tracker

A local-first web application for tracking study. Manage study sessions, organize subjects, review study history, and generate PDF reports.

**Documentation:** [English](README.md) | [Türkçe](README.tr.md)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Installation Guide](#installation-guide)
  - [1. Install Node.js and npm](#1-install-nodejs-and-npm)
  - [2. Obtain the Project](#2-obtain-the-project)
  - [3. Open the Project Directory](#3-open-the-project-directory)
  - [4. Install Dependencies](#4-install-dependencies)
  - [5. Start the Application](#5-start-the-application)
- [Available Commands](#available-commands)
- [Data Storage and Backups](#data-storage-and-backups)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)

## Overview

Study Tracker helps students record and review their study activities. The application runs in a web browser and stores data locally using IndexedDB.

The current version does not require a user account, remote server, or cloud service.

## Features

- Dashboard with study summaries and statistics
- Study record creation, editing, and deletion
- Calendar-based study history
- User-defined categories and subjects
- Reports for daily, weekly, biweekly, monthly, and custom date ranges
- PDF report export
- JSON data backup and restore
- Explicitly confirmed local data reset
- Turkish and English interface localization
- Automatic initial language selection based on browser language
- Persistent language preference

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Static type checking |
| Vite | Development server and production build |
| Tailwind CSS | Styling |
| IndexedDB | Local browser storage |
| `idb` | IndexedDB API wrapper |
| `jsPDF` | PDF generation |
| `jspdf-autotable` | Tables in PDF reports |
| `date-fns` | Date operations |
| `lucide-react` | Icons |

## System Requirements

Required:

- A supported desktop operating system: Windows, Linux, or macOS
- Node.js, preferably an active LTS release
- npm, included with Node.js
- A modern web browser
- Internet access for downloading the project and installing dependencies

Git is optional if you download the project as a ZIP archive. It is required if you clone the repository using Git.

> **Important:** Node.js is a development and runtime tool required by the setup commands. It does not mean the application itself is Windows-specific. The current project runs in a browser and does not provide a standalone desktop installer.

## Installation Guide

### 1. Install Node.js and npm

Node.js provides the JavaScript runtime used by the development tools. npm installs the project's dependencies.

1. Visit the official Node.js website: https://nodejs.org/
2. Download an active LTS release for your operating system.
3. Run the installer and follow its instructions.
4. Keep npm enabled in the installation options if prompted.
5. Finish the installation.
6. Close and reopen your terminal so the updated PATH can be detected.

Verify the installation:

```bash
node --version
npm --version
```

Both commands should print version numbers.

If either command is not recognized, restart the terminal. If the problem persists, check that Node.js is installed and that its installation directory is available through your system's PATH.

### 2. Obtain the Project

Choose one of the following methods.

**Option A — Download the source code**

1. Open the project's GitHub repository in your browser.
2. Select **Code**, then **Download ZIP**.
3. Extract the downloaded archive.
4. Locate the extracted project directory containing `package.json` and `package-lock.json`.

**Option B — Clone the repository**

Install Git from https://git-scm.com/ if necessary. Then run the following command, replacing the placeholder with the actual repository URL:

```bash
git clone https://github.com/yeetakn/study-tracker.git
```

Open the directory created by Git.

The project root is the directory containing `package.json`. All commands in this guide should be executed from that directory.

### 3. Open the Project Directory

Open a terminal in the project root.

Alternatively, open the project folder in Visual Studio Code and select **Terminal → New Terminal**.

Verify that the expected files are present:

```text
package.json
package-lock.json
README.md
README.tr.md
src/
public/
```

The directory names may change as the project evolves, but `package.json` must be present before you install dependencies.

### 4. Install Dependencies

Run:

```bash
npm ci
```

`npm ci` installs the dependency versions recorded in `package-lock.json`. It is recommended for a clean and reproducible installation.

If the lockfile is missing or intentionally needs to be regenerated, use:

```bash
npm install
```

Wait for npm to finish. If installation fails, review the terminal output before proceeding.

Do not delete `package-lock.json` as a routine troubleshooting step. It helps keep dependency versions consistent.

#### Windows PowerShell

If PowerShell blocks `npm.ps1` because of the current execution policy, use the Windows command shim:

```powershell
npm.cmd ci
```

If necessary, use `npm.cmd install` instead of `npm install`.

This workaround does not require changing the system's execution policy.

### 5. Start the Application

Start the Vite development server:

```bash
npm run dev
```

On Windows PowerShell, if needed:

```powershell
npm.cmd run dev
```

Wait until Vite displays a local URL. Open that URL in your browser. The default address is usually:

http://localhost:5173/

Keep the terminal open while using the development server. Closing the terminal stops the server.

To stop it manually, focus the terminal and press `Ctrl+C`.

## Available Commands

Run these commands from the project root.

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Runs TypeScript project checks and creates a production build |
| `npm run lint` | Runs ESLint |
| `npm run preview` | Serves the production build locally for preview |

Windows PowerShell alternatives:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run preview
```

### Verify the Project

Run the following checks before submitting changes or publishing an update:

```bash
npm run lint
npm run build
```

Both commands should finish without errors. A Vite bundle-size warning may still appear during the build; a warning is not necessarily a failed build.

### Production Build

To generate production assets:

```bash
npm run build
```

The output is written to the `dist/` directory.

To preview those assets locally:

```bash
npm run preview
```

The preview server is intended for local verification. It is not, by itself, a production hosting service or a standalone installer.

## Data Storage and Backups

Study records and subject information are stored in the browser's IndexedDB database.

- Data is stored locally in the browser used to access the application.
- The current version does not automatically synchronize data between devices or browsers.
- Clearing browser site data may permanently delete local records.
- JSON backup and restore are available for transferring data.
- Create a backup before resetting data, changing browsers, or moving to another device.

After restoring a backup, verify that the expected records and subjects are present.

**Data reset is destructive.** Use it only when you intend to clear the application's local data, and create a backup beforehand if the records matter.

## Troubleshooting

### `node` or `npm` is not recognized

- Verify that Node.js is installed.
- Close and reopen the terminal.
- Run `node --version` and `npm --version` again.
- Check the system PATH if the commands remain unavailable.

### PowerShell reports that `npm.ps1` cannot run

Use `npm.cmd` in place of `npm`. For example:

```powershell
npm.cmd ci
npm.cmd run dev
```

### Dependency installation fails

- Check your internet connection.
- Confirm that the terminal is in the project root.
- Review the first meaningful error in the npm output.
- Confirm that your Node.js version is compatible with the project.
- Retry `npm ci` after resolving the underlying issue.

### The local address does not open

- Confirm that Vite is still running in the terminal.
- Open the exact URL displayed by Vite.
- Check whether another application is using the same port.
- Review any error reported by the development server.

### Changes are not visible in the browser

- Confirm that the development server is running.
- Check the browser console for runtime errors.
- Refresh the page if necessary.

### The build reports a large-chunk warning

Vite may warn when a generated JavaScript chunk exceeds its configured size threshold. This warning does not automatically mean that the build has failed. Review the build output and consider code splitting if startup performance needs improvement.

### Local data is missing

- Confirm that you are using the same browser and browser profile.
- Check whether browser site data was cleared.
- Restore a previously exported JSON backup if available.

## Limitations

- The current application is a browser-based web app.
- Data is stored locally in browser storage.
- Data is not automatically shared across devices.

For development, install Node.js and the project dependencies as described above.