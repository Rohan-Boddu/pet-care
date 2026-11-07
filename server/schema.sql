CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'adopter' CHECK (role IN ('adopter', 'admin')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Dog', 'Cat', 'Rabbit', 'Other')),
  breed TEXT NOT NULL,
  age TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  location TEXT NOT NULL DEFAULT 'Vijayawada',
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Pending', 'Adopted')),
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  vaccination TEXT NOT NULL DEFAULT '',
  health TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18),
  occupation TEXT NOT NULL,
  address TEXT NOT NULL,
  residence TEXT NOT NULL,
  experience TEXT NOT NULL,
  current_pets TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS applications_applicant_created
  ON applications(applicant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_pet_status
  ON applications(pet_id, status);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
