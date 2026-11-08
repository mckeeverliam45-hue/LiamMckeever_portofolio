# Admin setup

The admin dashboard requires PHP with PDO MySQL enabled and the `digital_cv` MySQL database.
Serve the project through Apache/PHP (for example, with XAMPP) and open
`/index/admin.html`; opening the HTML files with a `file://` URL will not connect to PHP.

1. Import `database/digital_cv.sql` into MySQL. The script creates the required
   tables, including the editable skills catalog, and adds starter portfolio
   content only when the corresponding tables are empty. To add the skills
   feature to an existing installation, import the updated SQL file again; it
   creates and seeds the skills table without replacing existing records.
2. Configure `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASS` for PHP. The defaults in
   `db.php` are `localhost`, `digital_cv`, `root`, and an empty password.
3. Create the `MCKEEVER` admin account from PowerShell in the project directory.
   The command securely prompts for a password of at least 12 characters:

   ```powershell
   $securePassword = Read-Host "Choose an admin password (12+ characters)" -AsSecureString
   $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
   try {
     $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
     php backend/create_admin.php
   } finally {
     Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
   }
   ```

   Running the script again resets the `MCKEEVER` account's password. To use a
   different username, set `ADMIN_USERNAME` before running the script.
4. Visit `/index/admin.html` and sign in. The dashboard can review/delete contact
   messages and create, edit, or delete projects, education records, and skills.
   Portfolio content changes appear on the public site.

Use HTTPS when the site is deployed publicly so the admin session cookie is secure.
