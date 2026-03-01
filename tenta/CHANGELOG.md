# Changelog & Features Tracker

All notable changes to the **Glowapp Webadmin** project will be documented in this file.

---

## [Unreleased / Latest] - 2026-03-01

### Added
- **RawPhotoExtractor (Admin Feature)**:
  - Client-side extraction tool for downloading batches of raw images needing AI enhancement.
  - Queries Firestore queue (`imageStatus: 'raw'`) respecting memory limits (max 100/batch).
  - Implements concurrency locks using Batch Writes (`imageStatus: 'processing'`) to prevent duplicates.
  - Zips files perfectly in-memory using `jszip` without utilizing server computing.
  - Includes a 'Ghost File' safety net to handle storage anomalies, auto-flagging them as `missing` in DB.
- **BulkPhotoDropzone (Admin Feature)**:
  - Smart drag-and-drop area for uploading AI-enhanced product photos.
  - Native browser `.webp` image conversion (Canvas API) to significantly reduce Firebase Storage costs and bandwidth.
  - Automatic Firestore database binding linking `productID` (from filename) to the uploaded image.
  - Safe cleanup mechanism to delete raw photos from `/raw_photos/` upon successful conversion and linking.
  - Granular UI handling for states: pending, uploading, success, network interruption/retry, size/format violations, and database "Orphan ID" mismatches.

### Fixed
- **MergerModal Persistence Logic**:
  - Restored the Multi-Strategy Persistence logic that handles writing merged Excel data to both the primary `products` Firestore collection and the secondary `products_location_b` JSON Storage file.
  - Retained the new Aurum UI classes and `framer-motion` animations during the restoration.

### Changed
- **Global UI Overhaul (Aurum Design System)**:
  - Transitioned the entire app aesthetic to the "Aurum" design language (stark contrasts, true blacks, amber accents, minimalist typography).
  - Replaced legacy UI components with custom Tailwind CSS implementations and `framer-motion` page transitions.

---

## Currently Working Features (App Audit)

### 1. Authentication (`LoginForm`)
- Secure Firebase Email/Password authentication flow.

### 2. Administrator Dashboard (`Dashboard`)
- Central hub for navigation, tracking Firebase writes, and initiating the global Firebase-to-IndexedDB local synchronization (`syncProductsFromFirebase`).
- Features a real-time sync status card indicating indexed product count, missing photos, and last sync timestamp.

### 3. Smart Search & Scanner (`ScannerModal`)
- Fast local lookup against the IndexedDB storage for immediate product retrieval without incurring Firebase read costs.

### 4. Product Details (`ProductModal`)
- View detailed metadata and imagery for selected products.

### 5. Multi-Strategy Excel Merger (`MergerModal`)
- Allows merging of two Excel files based on specific logic, parsing data dynamically.
- Features multi-strategy persistence paths to either Firestore (`products`) or Firebase Storage (`products_location_b`).

### 6. JSON Data Importer (`ImporterModal`)
- Facilitates safe bulk importing of JSON structured data directly into the database.

### 7. Automated Photo Enhancement Pipeline (`BulkPhotoDropzone`)
- (See Latest Added section) Fully automated WebP conversion and linking for administrative batches.
