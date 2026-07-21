---
name: QR Code Scanning Integration
description: Guidelines for implementing and troubleshooting the barcode/QR code scanning features. Use this skill when modifying scanner components like ScannerModal.jsx.
---
# QR Code Scanning Integration

The project relies heavily on scanning physical products. When modifying this flow:

1. **Libraries**:
   - The primary dependencies are `@zxing/library` and `html5-qrcode`.
2. **Camera Handling**:
   - Ensure camera permissions are gracefully requested. Handle cases where the user denies permissions or has no camera available.
   - Refer to `ScannerModal.jsx` and the `<div id="reader">` pattern in `App.jsx` for existing implementations.
3. **Data Resolution**:
   - Scanned codes must map correctly to the product IDs in the local state (originating from `tentadb.json`). Provide visual feedback if a scanned code is not found.
