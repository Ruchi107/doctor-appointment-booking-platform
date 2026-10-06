# Doctor Appointment Booking Platform

Working prototype: patient search/booking with concurrency-safe slot locking,
provider slot management and accept/decline workflow, and medical notes
upload/retrieval. Node.js + Express + MySQL backend, plain HTML/CSS/JS
frontend (no framework, no build step).

## 1. Prerequisites
- Node.js v18+
- MySQL Server v8+

## 2. Set up the database
```bash
mysql -u root -p < database/schema.sql
```
Note: the two sample provider rows use a `PLACEHOLDER` password hash — you
won't be able to log in as them until you either register your own provider
account through the app, or manually update their `password_hash` with a
real bcrypt hash.

## 3. Set up the backend
```bash
cd backend
npm install
cp .env.example .env
```
Fill in your MySQL password and a random `JWT_SECRET` in `.env`, then:
```bash
npm start
```

## 4. Open the app
```
http://localhost:5000
```
The backend serves the frontend directly — no separate server needed.

## 5. Demo script
1. Register a **Provider** account (with a specialty) and a **Patient**
   account.
2. As the provider, go to **Manage Slots** and add a few open slots.
3. As the patient, go to **Find a Doctor**, search, open the provider's
   profile, and **book a slot**.
4. As the provider, go to **Appointment Requests** and **Accept** it.
5. Still as the provider, **upload a medical note/prescription** for the
   now-confirmed appointment — this marks it "completed".
6. As the patient, check **My Prescriptions** to see the uploaded file, and
   **My Appointments** to see the status change.

## 6. How this maps to the SRS / requirements
| Requirement | Where it's implemented |
|---|---|
| Search doctors by specialty/name/location | `doctorController.searchDoctors`, `search.html` |
| Book/cancel appointment slots | `appointmentController.js`, `doctor-profile.html`, `my-appointments.html` |
| No double-booking under concurrent requests | `bookAppointment` uses `SELECT ... FOR UPDATE` inside a transaction to lock the slot row |
| Set available time slots | `slotController.js`, `provider-slots.html` |
| Accept/decline appointments | `decideAppointment`, `provider-appointments.html` |
| Upload medical notes | `notesController.uploadNote` |
| Access control on medical records | `getNotesForAppointment` only returns rows where the requester is the patient or the treating provider |

## 7. Known simplifications
- No payment integration.
- No tele-consultation/video calls.
- Notifications (email/SMS) are omitted — status changes are visible only
  when the user reloads the relevant page.
- Doctor credential verification at onboarding is not implemented; any
  provider registration is accepted as-is.
