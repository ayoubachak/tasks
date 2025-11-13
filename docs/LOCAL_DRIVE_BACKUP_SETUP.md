## Local Google Drive Backup Setup

Use this guide when you want to run the app on your own machine and connect it to **your** Google Drive account for backups/sync.

---

### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or reuse an existing one).
3. Enable the **Google Drive API** for this project.

---

### 2. Configure the OAuth consent screen

1. In the left sidebar, open **APIs & Services → OAuth consent screen**.
2. Application type: **External** (you can stay in testing mode for personal use).
3. Add your Google account as a **Test user**.
4. Populate the basic app info (name, support email).
5. Save.

### 3. Create OAuth client credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Choose **Web application**.
4. Set the name (e.g., `Tasks Local Dev`).
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (Vite default)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173/auth-callback.html`
7. Save. Copy the **client ID** – you will need it for the `.env` file.

---

### 4. Configure environment variables

1. Create a file named `.env.local` in the project root (next to `package.json`).
2. Add the Google client ID:

   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

   (Keep this file out of version control.)

---

### 5. Run the app locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. When you connect Google in the UI:

- A popup will open.
- Grant the `drive.file` scope.
- Because the consent screen is in testing mode, you must use a test user.

---

### 6. GitHub Pages vs. local development

For GitHub Pages deployments you follow a similar setup but use `https://<username>.github.io` as the origin and redirect URI. For local development you only need the localhost entries described above.

---

### Troubleshooting tips

- **Popup blocked:** allow popups for your local dev origin.