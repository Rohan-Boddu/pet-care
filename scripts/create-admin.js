import { db, resetAdminPassword } from "../server/database.js";

if (process.argv.length > 2) {
  console.error("Usage: npm run admin:create");
  process.exitCode = 1;
} else {
  const { email, password } = resetAdminPassword();
  console.log(`The single admin password was reset.\nEmail: ${email}\nPassword: ${password}\nIt is also saved in data/admin-credentials.txt.`);
}
db.close();
