# PawCare

PawCare is a React pet adoption app backed by a local SQLite database. It includes a public pet catalog, account registration and sign-in, adoption applications, applicant history, and an admin dashboard.

## Requirements and local setup

- Node.js 22.13 or newer (the server uses Node's built-in `node:sqlite` module)
- npm

Run:

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The development command starts both the React app and its local API. SQLite creates `data/pawcare.sqlite` automatically, creates the schema from `server/schema.sql`, and seeds the initial pet catalog on first run. The database, session signing key, accounts, pets, applications, and sessions stay on this machine and are ignored by Git.

Create an account in the app to apply for pets. Passwords are stored as salted scrypt hashes; the browser receives an HTTP-only session cookie rather than a password or authentication token.

## Admin access

On first startup, PawCare creates one administrator account with a random password and saves its credentials in `data/admin-credentials.txt` (a local-only file with restricted permissions). The account email is `admin@pawcare.local`.

Rotate the password for that account:

```sh
npm run admin:create
```

The password is also saved in `data/admin-credentials.txt`. The database prevents creating a second administrator, and public registration cannot grant admin access.

## Routes

- `/` — sign-in landing page; signed-in users and guests see the home page
- `/pets` and `/pets/:id` — searchable catalog and pet details
- `/login` and `/register` — account sign-in and registration
- `/apply?pet=<id>` — adoption application (requires sign-in)
- `/account` — signed-in user's application history
- `/admin` — pet and application management (admins only)

Run the API and React frontend together with `npm run dev`. Build production assets with `npm run build`, then serve the generated `dist` folder and API on the same origin with `npm start`.

The API binds to `127.0.0.1` by default. This is a local, single-machine application. Before exposing it to a network, configure `PAWCARE_HOST`, a strong `PAWCARE_SESSION_SECRET`, HTTPS, backups, and appropriate operational security.

The included Vercel configuration deploys a static demo: the public catalog works, but Vercel rewrites `/api` requests to the frontend, so real login, applications, and admin operations require deploying the API with a persistent database. Do not treat browser-only demo accounts as administrator credentials.
