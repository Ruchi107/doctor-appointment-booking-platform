-- Doctor Appointment Booking Platform — Database Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS doctor_appointment;
USE doctor_appointment;

-- ========== USERS ==========
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('patient', 'provider', 'admin') NOT NULL DEFAULT 'patient',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== DOCTORS (one-to-one with a 'provider' user) ==========
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    specialty VARCHAR(100) NOT NULL,
    qualifications VARCHAR(255),
    clinic_location VARCHAR(255),
    bio TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========== SLOTS ==========
CREATE TABLE slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('open', 'requested', 'booked', 'blocked') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_slot (doctor_id, slot_date, start_time)
);

-- ========== APPOINTMENTS ==========
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    slot_id INT NOT NULL UNIQUE,
    status ENUM('requested', 'confirmed', 'rejected', 'cancelled', 'completed')
        NOT NULL DEFAULT 'requested',
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP NULL,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE
);

-- ========== MEDICAL NOTES / PRESCRIPTIONS ==========
CREATE TABLE medical_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    notes_text TEXT,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ========== SAMPLE DATA ==========
-- Sample provider users (password hashing happens at app level — see README)
INSERT INTO users (name, email, password_hash, role) VALUES
('Dr. Anjali Rao', 'anjali.rao@example.com', 'PLACEHOLDER', 'provider'),
('Dr. Vikram Shah', 'vikram.shah@example.com', 'PLACEHOLDER', 'provider');

INSERT INTO doctors (user_id, specialty, qualifications, clinic_location) VALUES
(1, 'Cardiology', 'MD, DM Cardiology', 'City Hospital, Andheri'),
(2, 'Dermatology', 'MBBS, MD Dermatology', 'Skin Care Clinic, Bandra');

INSERT INTO slots (doctor_id, slot_date, start_time, end_time, status) VALUES
(1, CURDATE() + INTERVAL 1 DAY, '10:00:00', '10:30:00', 'open'),
(1, CURDATE() + INTERVAL 1 DAY, '10:30:00', '11:00:00', 'open'),
(2, CURDATE() + INTERVAL 1 DAY, '15:00:00', '15:30:00', 'open');
