---
name: Excel and JSON Data Management
description: Standard procedures for handling Excel product imports, merging data, and managing backups. Use this skill when working with ExcelMerger.jsx, BackupManager.jsx, or ImporterModal.jsx.
---
# Excel and JSON Data Management

When the user requests changes to data ingestion, excel exports, or backups, follow these guidelines:

1. **Libraries**:
   - Use `xlsx` for parsing spreadsheets and reading workbook data.
   - Use `file-saver` for triggering file downloads and exports on the client side.
2. **Merging Logic** (`ExcelMerger.jsx`):
   - Excel uploads must be validated before being merged into the primary product state.
   - Ensure you do not destructively overwrite existing products unless explicitly requested; use additive patches or prompt the user for conflict resolution.
3. **Backups** (`BackupManager.jsx`):
   - Prioritize keeping data secure. Before bulk operations (like mass imports), ensure a backup snapshot is taken or prompted.
