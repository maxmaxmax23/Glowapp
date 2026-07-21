---
name: Firebase Sync Protocol
description: Standard operating procedure for synchronizing local JSON data (src/tentadb.json) with the remote Firestore database. Use this skill when modifying product data or syncing databases.
---
# Firebase Sync Protocol

When synchronizing product data between the local environment and Firebase Firestore, follow these rules:

1. **Local Data First**: `src/tentadb.json` acts as the primary data source during local development.
2. **Pulling from Firestore**:
   - To overwrite local data with the latest from the database, run:
     ```bash
     npm run sync:pull
     ```
   - *Warning*: This will overwrite `src/tentadb.json`. Make sure you have backed up local changes if necessary.
3. **Pushing to Firestore**:
   - To deploy local changes to the remote database, run:
     ```bash
     npm run sync:push
     ```
   - This uses a merge operation, so existing fields not in the JSON won't be deleted, but existing records with the same ID will be updated.
4. **Manual Edits**:
   - Never manually overwrite `src/tentadb.json` with external data without running a backup first.
