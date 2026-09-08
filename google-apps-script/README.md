# Google Drive Bridge — Google Apps Script Setup Guide
**Phase 13: Google Drive Bridge**  
**Spec Reference: §3.6, §3.7, §4.16, §8**

---

## Overview
The Google Drive Bridge provides a lightweight, zero-cost integration between **GDGoC HNU OS** and the chapter's **Google Drive**. It allows the platform to:
1. Automatically create and organize chapter folders (`Departments`, `Events`, `Media Library`, `Certificates`, `Reports`).
2. Upload files with shareable Google Drive links.
3. List and delete files directly from the web workspace.
4. Store folder mappings in Supabase `drive_folder_map` table.

---

## Deployment Steps (5 Minutes)

### Step 1: Create the Root Workspace Folder in Google Drive
1. Log in to the chapter's official Google Account (or your GDGoC Google Account).
2. Go to [Google Drive](https://drive.google.com).
3. Click **New** > **New Folder** and name it:
   ```
   GDGoC HNU OS Workspace
   ```
4. (Optional) Note down the Folder ID from the URL:
   `https://drive.google.com/drive/folders/<FOLDER_ID_HERE>`

---

### Step 2: Create the Apps Script Project
1. Go to [Google Apps Script](https://script.google.com/home).
2. Click **New project** (top left).
3. Name the project:
   ```
   GDGoC HNU OS Drive Bridge
   ```
4. Copy the entire contents of `Code.gs` (from this repository) and paste it into the editor, replacing any default code.
5. In project settings (gear icon on the left):
   - Check **"Show 'appsscript.json' manifest file in editor"**.
   - Return to the editor and paste the contents of `appsscript.json`.

---

### Step 3: Configure Shared Secret Token
1. In the Apps Script project, click the **Project Settings** (gear icon ⚙️) on the left sidebar.
2. Scroll down to **Script Properties** and click **Add script property**:
   - **Property**: `DRIVE_BRIDGE_SECRET`
   - **Value**: Any strong random secret key (e.g. `gdgoc_hnu_drive_secret_998124`).
3. (Optional) Add `ROOT_FOLDER_ID` if you want to explicitly pin a specific root folder:
   - **Property**: `ROOT_FOLDER_ID`
   - **Value**: `<The folder ID from Step 1>`
4. Click **Save script properties**.

---

### Step 4: Deploy as Web App
1. At the top right of the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `Production Bridge v1.0`
   - **Execute as**: `Me (<your-email>@...)` *(Crucial: allows the script to access Drive on behalf of the chapter)*
   - **Who has access**: `Anyone` *(Secured by the shared secret token checked on every request)*
4. Click **Deploy**.
5. Google will prompt you to **Authorize access**:
   - Choose your account.
   - Click **Advanced** > **Go to GDGoC HNU OS Drive Bridge (unsafe)**.
   - Click **Allow**.
6. Copy the generated **Web app URL**:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

### Step 5: Connect to GDGoC HNU OS
1. Navigate to `/settings/drive` in the GDGoC HNU OS web application (President access required).
2. Paste your **Web app URL** and **Shared Secret Token**.
3. Click **Save and Test Connection**.
4. The system will ping the Web App and confirm that the root folder is active!

---

## API Reference

All requests must include the `secret` parameter (in query string or JSON payload).

### 1. Ping / Health Check
- **Method**: `GET` or `POST`
- **Payload**:
  ```json
  {
    "action": "ping",
    "secret": "your_secret_here"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "status": "online",
    "rootFolderId": "...",
    "rootFolderName": "GDGoC HNU OS Workspace",
    "rootFolderUrl": "https://drive.google.com/drive/folders/..."
  }
  ```

### 2. Ensure Folder Path
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "action": "ensureFolderPath",
    "secret": "your_secret_here",
    "pathSegments": ["Events", "2026", "Orientation"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "folderId": "...",
    "folderName": "Orientation",
    "folderUrl": "https://drive.google.com/drive/folders/...",
    "path": "/Events/2026/Orientation"
  }
  ```

### 3. Upload File
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "action": "uploadFile",
    "secret": "your_secret_here",
    "folderId": "target_folder_id",
    "fileName": "event-banner.png",
    "mimeType": "image/png",
    "base64Data": "<base64_encoded_file_string>",
    "makePublic": true
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "fileId": "...",
    "fileName": "event-banner.png",
    "fileUrl": "https://drive.google.com/file/d/...",
    "downloadUrl": "https://drive.google.com/uc?export=download&id=..."
  }
  ```
