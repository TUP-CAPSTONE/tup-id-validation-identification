<div align="center">

<img src="https://img.shields.io/badge/TUP--SIIVS-Student%20ID%20%26%20Validation%20System-8B0000?style=for-the-badge&logoColor=white" alt="TUP-SIIVS" />

<h1>🎓 TUP-SIIVS</h1>
<h3>Student Identification and ID Validation System</h3>
<p><em>Technological University of the Philippines – Manila</em></p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth%20%7C%20Storage-FFCA28?style=flat-square&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-InsightFace%20%7C%20FAISS-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/ISO%2FIEC-25010%20Evaluated-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/License-Academic%20Thesis-red?style=flat-square" />
</p>

<p>
A fully automated, web-based system that replaces TUP-Manila's manual student ID validation process with facial recognition, digital document submission, and centralized dashboards — built as a BSCS-4A thesis project.
</p>

</div>

---

## 📑 Table of Contents

- [✨ Overview](#-overview)
- [🚀 Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ System Architecture](#️-system-architecture)
- [👥 User Roles](#-user-roles)
- [⚙️ Getting Started](#️-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [📁 Project Structure](#-project-structure)
- [📦 Modules](#-modules)
  - [🎓 Student Portal](#-student-portal)
  - [🔧 Admin Portal](#-admin-portal)
  - [🏢 OSA Portal](#-osa-portal)
  - [🚪 Gate Account](#-gate-account)
- [🗄️ Database Schema](#️-database-schema)
- [💻 Hardware Requirements](#-hardware-requirements)
- [⚠️ Known Limitations](#️-known-limitations)
- [🔒 Compliance](#-compliance)
- [📄 License](#-license)

---

## ✨ Overview

TUP-Manila previously required students to physically line up at the **Office of Student Affairs (OSA)** every semester for manual ID validation — a slow, error-prone process vulnerable to impersonation and long queues.

**TUP-SIIVS** replaces this entirely with:

| Before | After |
|--------|-------|
| Physical queuing at OSA | Online document submission |
| Manual ID inspection by guards | Real-time facial recognition at gates |
| Paper-based sticker distribution | QR code generation & digital claiming |
| No centralized records | Unified dashboards per role |
| Error-prone manual verification | AI-powered biometric authentication |

> Evaluated against the **ISO/IEC 25010** software quality standard across Efficiency, Accuracy, and Effectiveness — receiving **Very High Extent** ratings (avg. 4.6/5.0) from 30 student respondents.

---

## 🚀 Features

<table>
<tr>
<td width="50%">

**🤖 Facial Recognition**
Camera-based student identification at campus gates using InsightFace + FAISS + OpenCV via a dedicated Python service on Railway.

**📋 Online ID Validation**
Students submit their school ID, Certificate of Registration (COR), and a selfie digitally. OSA reviews and approves or rejects requests.

**📱 QR Code Validation**
Approved students receive a time-limited QR code for claiming their physical ID sticker at the OSA.

**📧 Automated Email Notifications**
Firebase Cloud Function triggers send emails for registration status, validation decisions, scheduling, and offense notifications.

</td>
<td width="50%">

**⚖️ Student Offense Tracking**
OSA files and manages disciplinary records. Students view their offense history and sanction status on their dashboard.

**👨‍👩‍👧 Guardian Notifications**
Optional email alerts to student guardians for unresolved disciplinary offenses.

**🧠 FAISS Index Management**
Admin-triggered rebuilds of the facial embedding similarity index to maintain recognition accuracy as new students enroll.

**⚙️ System Settings**
Configurable ID validation periods, sticker claiming windows, semester lifecycle management, and JSON data backup/export.

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

<div align="center">

| Category | Technology |
|:---:|:---|
| ![Next.js](https://img.shields.io/badge/-Next.js%2016-black?style=flat-square&logo=next.js) | App Router, Server Components, API Routes |
| ![React](https://img.shields.io/badge/-React%2019-61DAFB?style=flat-square&logo=react&logoColor=black) | Frontend UI framework |
| ![TypeScript](https://img.shields.io/badge/-TypeScript%205-3178C6?style=flat-square&logo=typescript&logoColor=white) | Full-stack type safety |
| ![Tailwind](https://img.shields.io/badge/-Tailwind%20CSS%20v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | Utility-first styling |
| ![shadcn](https://img.shields.io/badge/-shadcn%2Fui-000000?style=flat-square&logo=shadcnui&logoColor=white) | Component library (Radix UI based) |
| ![Framer](https://img.shields.io/badge/-Framer%20Motion-0055FF?style=flat-square&logo=framer&logoColor=white) | Animations & transitions |
| ![Firebase](https://img.shields.io/badge/-Firebase%20Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black) | NoSQL database |
| ![Firebase](https://img.shields.io/badge/-Firebase%20Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black) | Authentication |
| ![Firebase](https://img.shields.io/badge/-Firebase%20Storage-FFCA28?style=flat-square&logo=firebase&logoColor=black) | File & image storage |
| ![Firebase](https://img.shields.io/badge/-Firebase%20Cloud%20Functions-FFCA28?style=flat-square&logo=firebase&logoColor=black) | Email triggers & backend automation |
| ![Python](https://img.shields.io/badge/-Python%20%7C%20InsightFace%20%2B%20FAISS-3776AB?style=flat-square&logo=python&logoColor=white) | Facial recognition microservice |
| ![Railway](https://img.shields.io/badge/-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white) | Python service hosting |
| ![Upstash](https://img.shields.io/badge/-Upstash%20Redis-00E9A3?style=flat-square&logo=upstash&logoColor=black) | Caching & rate limiting |
| ![Vercel](https://img.shields.io/badge/-Vercel-000000?style=flat-square&logo=vercel&logoColor=white) | Next.js deployment |
| `qrcode` + `html5-qrcode` | QR code generation & scanning |
| `jsPDF` + `jsPDF-AutoTable` | PDF report export |
| `TanStack React Table` | Data tables with filtering & sorting |

</div>

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App  (Vercel)                    │
│                                                             │
│   ┌──────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│   │  Student UI  │  │  Admin UI   │  │  OSA  /  Gate UI  │  │
│   └──────┬───────┘  └──────┬──────┘  └────────┬──────────┘  │
│          └─────────────────┴──────────────────┘             │
│                     Next.js API Routes                      │
│        ┌────────────────────┬──────────────────────┐        │
│        │  Upstash Redis     │  Firebase Cloud      │        │
│        │  (Rate Limiting)   │  Functions (Emails)  │        │
│        └────────────────────┴──────────────────────┘        │
└──────────────────────────┬──────────────────────────────────┘
                           │
             ┌─────────────┴───────────────┐
             │                             │
   ┌─────────▼───────────┐    ┌────────────▼───────────────────┐
   │     Firebase        │    │   Railway  (Python Service)    │
   │  ┌──────────────┐   │    │                                │
   │  │  Firestore   │   │    │  InsightFace  (embeddings)     │
   │  │  Auth        │   │    │  FAISS        (similarity)     │
   │  │  Storage     │   │    │  OpenCV       (image capture)  │
   │  │  Functions   │   │    │  ONNX Runtime (inference)      │
   │  └──────────────┘   │    │  NumPy        (computation)    │
   └─────────────────────┘    └────────────────────────────────┘
```

---

## 👥 User Roles

<table>
<tr>
<td align="center" width="25%">

### 🎓 Student
Registers an account, captures face photos, submits ID validation requests, views offense records, and scans in/out at campus gates via facial recognition.

</td>
<td align="center" width="25%">

### 🚪 Gate Account
Operates the gate kiosk. The system drives the connected camera for live facial recognition to log student entry and exit automatically.

</td>
<td align="center" width="25%">

### 🏢 OSA Staff
Reviews ID validation submissions, scans QR codes for sticker claiming, files and manages student disciplinary offense records, notifies guardians.

</td>
<td align="center" width="25%">

### 🔧 Website Admin
Full system control — manages all accounts, monitors entrance/exit logs, configures semester settings, triggers FAISS index rebuilds, handles feedback.

</td>
</tr>
</table>

---

## ⚙️ Getting Started

### Prerequisites

- ![Node.js](https://img.shields.io/badge/Node.js-18.x%2B-339933?style=flat-square&logo=node.js&logoColor=white) or later
- A **Firebase** project with **Firestore**, **Authentication**, **Storage**, and **Cloud Functions** enabled
- An **Upstash Redis** database
- A **Railway** account for the Python facial recognition service

### Installation

```bash
# Clone the repository
git clone https://github.com/TUP-CAPSTONE/tup-id-validation-identification.git
cd tup-siivs

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# ─── Firebase Client-side ───────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ─── Firebase Admin (API Routes) ────────────────────────────
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# ─── Upstash Redis ──────────────────────────────────────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─── Railway Python Service (Facial Recognition) ────────────
FACIAL_RECOGNITION_API_URL=
FACIAL_RECOGNITION_API_KEY=
```

> [!WARNING]
> Never commit `.env.local` to version control. Ensure it is listed in `.gitignore`.

### Running the App

```bash
# Development  (Turbopack enabled)
npm run dev

# Production build
npm run build
npm run start

# Lint
npm run lint
```

> The app runs at **`http://localhost:3000`**

---

## 📁 Project Structure

```
tup-siivs/
├── 📂 app/
│   ├── 📂 clients/
│   │   ├── 📂 students/          # Student portal
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/
│   │   │   └── ...
│   │   ├── 📂 admin/             # Admin portal
│   │   ├── 📂 OSA/               # OSA portal
│   │   └── 📂 gate/              # Gate kiosk
│   └── 📂 api/                   # Next.js API Routes (backend)
├── 📂 components/                # Shared UI components (shadcn/ui)
├── 📂 lib/                       # Firebase config, utilities, helpers
├── 📂 types/                     # TypeScript type definitions
├── 📂 public/                    # Static assets
├── .env.local                    # Environment variables (gitignored)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 📦 Modules

### 🎓 Student Portal

| Page | Route | Description |
|------|-------|-------------|
| Landing Page | `/` | System introduction and entry point with a **Get Started** CTA. |
| Login | `/clients/students/login` | Email or TUP-ID + password authentication; Google sign-in supported. |
| Register | `/clients/students/register` | Multi-step form: personal details → face capture (6 angles) → guardian info → email OTP verification. |
| Dashboard | `/clients/students/dashboard` | Central hub: validation status, current semester badge, offense summary, profile completeness. |
| ID Validation Request | `/clients/students/dashboard/id-validation` | Upload school ID, COR, and selfie. Blocked automatically if a major offense is on record. |
| User Information | `/clients/students/dashboard/user-information` | View/edit profile details and full validation history. |
| My Offenses | `/clients/students/dashboard/my-offenses` | OSA-filed disciplinary records with offense type, date, sanction, and resolution status. |
| Give Feedback | `/clients/students/dashboard/feedback` | Submit feedback or report bugs to administrators. |

### 🔧 Admin Portal

| Page | Description |
|------|-------------|
| **Admin Dashboard** | Live overview: active sessions, account counts, pending registrations/validations, login/logout activity, statistics summary. |
| **Manage Student Registrations** | Review facial images and submitted details; approve or reject new account requests. |
| **Manage ID Validation Requests** | Semester-by-semester review of student ID, COR, and selfie submissions. |
| **Resend Validation QR Codes** | Regenerate and resend expired QR codes for students who missed sticker claiming, with a new expiry window. |
| **Manage System Accounts** | Create, edit, enable/disable, and delete OSA and Gate operator accounts. |
| **Manage Student Accounts** | View all registered students; disable accounts for policy violations. |
| **Monitor Entrance & Exit Logs** | Date-filtered view of all facial recognition gate events (entry, exit, unregistered). |
| **Manage Feedbacks & Bug Reports** | View and resolve user-submitted feedback and issue reports. |
| **Build FAISS Index** | Trigger a rebuild of the facial recognition similarity index from current student face data. |
| **System Settings** | Configure ID validation periods, sticker claiming windows, semester lifecycle, and data backup/export. |

### 🏢 OSA Portal

| Page | Description |
|------|-------------|
| **OSA Dashboard** | Validation statistics: pending, accepted, validated students, total requests, recent activity feed. |
| **Validation Requests** | Review student-submitted documents; approve or reject with email notification. |
| **QR Code Scanning** | Live camera-based QR code scanner for in-person sticker claiming verification. |
| **Students List** | Filterable, sortable table of all students with validation status; exportable to PDF per college. |
| **File Offense** | Create disciplinary records (offense type from TUP handbook, sanction, date, description). |
| **Manage Offenses** | Track active/resolved cases; add resolution notes; optionally notify student guardians via email. |
| **Feedbacks & Bug Reports** | Submit feedback or bug reports to the development team. |

### 🚪 Gate Account

The Gate Account is a **kiosk-style interface** running the live facial recognition pipeline:

```
Student approaches camera
        │
        ▼
   Face Detected?  ──No──▶  Standby
        │ Yes
        ▼
  Capture & Send to Railway Python Service
        │
        ▼
  Compare against FAISS Index
        │
   ┌────┴──────────────┐
   │ Match Found?      │
   │                   │
  Yes                  No
   │                   │
   ▼                   ▼
Display student     Log to
name, ID, photo,    Unregistered
section             Log
   │
   ▼
Auto-log entry/exit
in Firestore
```

---

## 🗄️ Database Schema

The system uses **Firebase Firestore** (NoSQL), organized into five logical groups:

<details>
<summary><b>🪪 Identity & Registration</b></summary>

| Collection | Description |
|------------|-------------|
| `users` | Auth accounts — role, email, account status, face embeddings vector |
| `student_profiles` | Extended student info — TUP ID, course, section, year level, face photos map |
| `registration_requests` | Pending new account submissions awaiting admin approval |
| `registered_students` | Approved student records with enrollment status and indexed boolean |

</details>

<details>
<summary><b>✅ Validation</b></summary>

| Collection | Description |
|------------|-------------|
| `validation_logs` | Per-request history — method, confidence score, validated-by, timestamps |
| `registered_validation` | Approved semester validations with generated QR code data and logs array |
| `rejected_validation` | Rejected requests with course, reasons, and student metadata |

</details>

<details>
<summary><b>⚖️ Operations & Enforcement</b></summary>

| Collection | Description |
|------------|-------------|
| `gate_accounts` | Gate operator credentials, device ID, gate name, location, status |
| `student_offenses` | Disciplinary records — offense type, sanction, status (active/resolved), recorded-by |
| `sticker_claim_slots` | Claiming period schedule with slot counts per index |

</details>

<details>
<summary><b>📊 Logs & Monitoring</b></summary>

| Collection | Description |
|------------|-------------|
| `entrance_exit_logs` | Facial recognition events — action, confidence score, device, gate ID, student ID, timestamp |
| `admin_action_logs` | Admin audit trail — action, performed-by, target request/student/role, timestamps |
| `session_logs` | User session records — action, email, role, admin, timestamp |
| `feedback_reports` | User-submitted feedback and bug reports |

</details>

<details>
<summary><b>🔧 System Utilities</b></summary>

| Collection | Description |
|------------|-------------|
| `mail` | Outgoing email queue — delivery map, message map, to address |
| `system_settings` | Semester config — validation period dates, school year, sticker period, started-by |

</details>

---

## 💻 Hardware Requirements

<table>
<tr>
<th>📷 Gate Camera</th>
<th>🖥️ Gate Server / PC</th>
<th>📱 Student Device</th>
</tr>
<tr>
<td>

- Resolution: **1080p+**
- Frame rate: **≥ 30 fps**
- Connectivity: **USB**

</td>
<td>

- CPU: **Intel Core i5/i7**
- RAM: **8–16 GB**
- OS: **Windows 10+**

</td>
<td>

- CPU: Snapdragon 6/7 Gen
- RAM: 4–6 GB
- Camera: 8–12 MP (front)
- OS: Android 12+
- Network: Wi-Fi or LTE/5G

</td>
</tr>
</table>

---

## ⚠️ Known Limitations

> [!NOTE]
> The following limitations are acknowledged and may be addressed in future iterations.

- **Internet Dependency** — The system requires a stable connection; offline mode is not supported.
- **Facial Recognition Accuracy** — Performance may degrade under poor lighting, low camera resolution, or facial obstructions (masks, hats, glasses).
- **TUP-Manila Scoped** — Implementation and student data are restricted to TUP-Manila. Adaptation is required for other campuses.
- **User Base** — Faculty, staff, and visitors are outside the current scope.
- **Hardware Sensitivity** — Low-spec devices may experience slower response times during recognition.
- **Index Rebuild Downtime** — The facial recognition service may be briefly unavailable during FAISS index rebuilds.
- **Email Delays** — Slow network conditions may delay OTP and notification email delivery.

---

## 🔒 Compliance

<table>
<tr>
<td width="50%">

**🇵🇭 Republic Act No. 10173**
*Data Privacy Act of 2012*

All biometric data and personal information are stored in encrypted Firebase Firestore and Firebase Storage. Access is strictly role-restricted. Students provide informed consent during registration.

</td>
<td width="50%">

**📐 ISO/IEC 25010**
*Software Quality Model*

The system was formally evaluated against:
Functionality · Performance Efficiency · Reliability · Usability · Security · Maintainability

Overall student rating: **4.61 / 5.00 — Very High Extent**

</td>
</tr>
</table>

---

## 📄 License

```
TUP-SIIVS — Student Identification and ID Validation System
Copyright © 2025 BSCS-4A, Technological University of the Philippines – Manila

This project was developed as an academic thesis.
All rights reserved.

Redistribution or commercial use without explicit written
permission from the authors is strictly prohibited.
```

---

<div align="center">

**Built by BSCS-4A · Technological University of the Philippines – Manila**

![TUP](https://img.shields.io/badge/TUP--Manila-BSCS--4A%20Thesis%20Project-8B0000?style=for-the-badge)

</div>