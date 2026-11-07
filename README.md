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

Create a new administrator with a unique, generated password:

```sh
npm run admin:create
```

The command prints the generated password once; save it securely. To grant admin privileges to an existing account instead, pass its email:

```sh
npm run admin:create -- person@example.com
```

Registration cannot set an admin role. There are no shared demo passwords.

## Routes

- `/` — sign-in landing page; signed-in users and guests see the home page
- `/pets` and `/pets/:id` — searchable catalog and pet details
- `/login` and `/register` — account sign-in and registration
- `/apply?pet=<id>` — adoption application (requires sign-in)
- `/account` — signed-in user's application history
- `/admin` — pet and application management (admins only)

Run the API and React frontend together with `npm run dev`. Build production assets with `npm run build`, then serve the generated `dist` folder and API on the same origin with `npm start`.

The API binds to `127.0.0.1` by default. This is a local, single-machine application. Before exposing it to a network, configure `PAWCARE_HOST`, a strong `PAWCARE_SESSION_SECRET`, HTTPS, backups, and appropriate operational security.
