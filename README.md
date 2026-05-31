# Smart Sales Import System with Duplicate Detection

A comprehensive, user-friendly sales record import system built with React, TypeScript, and TanStack Start. Features intelligent duplicate detection, flexible resolution options, and complete audit logging.

## 🎯 Features

### Smart Duplicate Detection
- **Multi-field matching**: Checks across invoice number, customer phone, order date, and product
- **Confidence scoring**: Each match shows a confidence percentage (75%-100%)
- **Intelligent thresholds**: Different detection criteria with appropriate confidence weights
- **Flexible tolerance**: Handles amount variations (±5%)

### User-Friendly Resolution
When a duplicate is detected, users can choose:
1. **Skip** - Keep existing record unchanged
2. **Update** - Replace with imported data
3. **Merge** - Intelligently combine data from both records
4. **Create New** - Import as separate record despite match

### Complete Audit Trail
- Every import action is logged with full details
- Track who performed the action and when
- Side-by-side comparison of original vs. new data
- Export audit logs to CSV for compliance

### File Support
- **CSV files** with auto-detection of field names
- **XLSX files** with full spreadsheet support
- Automatic field mapping (Invoice No, Phone, Date, Product, Amount)
- Data normalization (phone numbers, dates, amounts)

## 📦 Installation

### 1. Install Dependencies
```bash
npm install
# or
bun install
```

### 2. Setup Database
Run the SQL schema from `src/db/schema.sql` in your Supabase database:

```sql
-- Create tables
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  order_date DATE NOT NULL,
  product VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(invoice_number, customer_phone)
);

CREATE TABLE import_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES sales(id),
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  imported_data JSONB NOT NULL,
  existing_data JSONB,
  user_email VARCHAR(255),
  notes TEXT
);

CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_sales_customer_phone ON sales(customer_phone);
CREATE INDEX idx_audit_logs_timestamp ON import_audit_logs(timestamp);
```

### 3. Configure Environment Variables
Update `.env` file:
```env
SUPABASE_URL="your-supabase-url"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

## 🚀 Usage

### Start Development Server
```bash
npm run dev
# Navigate to http://localhost:5173/import
```

### Import Workflow

1. **Navigate to Import Page**: Visit `/import` route
2. **Prepare Your File**: Create CSV or XLSX with columns:
   - Invoice Number (or variations: Invoice No, Invoice #)
   - Customer Phone (or Phone Number)
   - Order Date (or Date)
   - Product
   - Amount (or Total)

3. **Upload File**: Drag and drop or click to select file

4. **Review Duplicates**: 
   - System automatically checks each record
   - For matches, compare old vs. new data
   - Select resolution action

5. **Monitor Progress**: Watch real-time import statistics

6. **Review Audit Log**: Check all operations in the audit log tab

### Example CSV Format
```csv
Invoice Number,Customer Phone,Order Date,Product,Amount
INV-001,5551234567,2024-01-15,Widget A,99.99
INV-002,5559876543,2024-01-16,Widget B,149.99
INV-003,5551234567,2024-01-17,Widget C,199.99
```

## 📊 Duplicate Detection Logic

### Confidence Levels

| Confidence | Criteria | Use Case |
|-----------|----------|----------|
| 100% | Invoice + Phone exact match | High certainty duplicate |
| 90% | Phone + Date + Product match | Same customer, same order, same product |
| 85% | Invoice number exact match | Unique invoice already exists |
| 75% | Phone + Amount (±5%) | Same customer, similar transaction |

## 🏗️ Project Structure

```
src/
├── components/
│   ├── ImportWizard.tsx          # Main import workflow
│   ├── DuplicateDetectionDialog.tsx # Duplicate resolution UI
│   └── AuditLogViewer.tsx         # Audit log viewer
├── services/
│   └── duplicateDetection.ts      # Core duplicate detection logic
├── pages/
│   └── ImportPage.tsx              # Import page component
├── db/
│   └── schema.sql                 # Database schema
└── styles/
    └── styles.css                 # Tailwind CSS config
```

## 🔧 API Services

### checkForDuplicate(record, tableName)
Checks if a record exists in the database.

```typescript
const result = await checkForDuplicate({
  invoiceNumber: 'INV-001',
  customerPhone: '5551234567',
  orderDate: '2024-01-15',
  product: 'Widget A',
  amount: 99.99
});

if (result.isDuplicate) {
  console.log(`Match found with ${result.confidence}% confidence`);
  console.log(`Matched fields: ${result.matchedFields.join(', ')}`);
}
```

### handleDuplicate(imported, existing, action, tableName, userEmail)
Processes the duplicate based on user's chosen action.

```typescript
await handleDuplicate(
  importedRecord,
  existingRecord,
  'merge', // 'skip' | 'update' | 'merge' | 'create'
  'sales',
  'user@example.com'
);
```

### logImportAction(action, importedData, existingData, userEmail, notes)
Logs every import operation for audit trail.

```typescript
await logImportAction(
  'merged',
  newData,
  oldData,
  'user@example.com',
  'Merged customer information'
);
```

## 📈 Statistics & Monitoring

### Import Statistics
- Total records processed
- Successfully imported
- Updated records
- Merged records
- Skipped records
- Failed operations

### Audit Log Filtering
Filter by action type:
- All Actions
- Imported (new records)
- Updated (replaced records)
- Merged (combined records)
- Skipped (unchanged records)
- Created (despite duplicates)

## 🔐 Security & Compliance

- **Row Level Security**: RLS policies can be enabled in Supabase
- **Audit Trail**: Every action logged with timestamp and user
- **Data Integrity**: UNIQUE constraints prevent accidental duplicates
- **Export Capability**: CSV export for compliance reports
- **User Tracking**: User email recorded with each action

## ⚙️ Advanced Configuration

### Customize Duplicate Detection
Edit `src/services/duplicateDetection.ts`:

```typescript
const queries = [
  {
    field1: 'invoice_number',
    value1: record.invoiceNumber,
    field2: 'customer_phone',
    value2: record.customerPhone,
    weight: 100, // Adjust confidence
  },
  // Add more query patterns
];
```

### Customize Field Mapping
Edit the `mapHeaderToField` function:

```typescript
const mapping: { [key: string]: string } = {
  'your-field-name': 'invoiceNumber',
  // Add more mappings
};
```

## 📝 Database Queries

### Get Recent Imports
```sql
SELECT * FROM import_audit_logs 
WHERE action = 'imported'
ORDER BY timestamp DESC
LIMIT 10;
```

### Find All Duplicates Handled
```sql
SELECT * FROM import_audit_logs 
WHERE action IN ('skipped', 'updated', 'merged')
ORDER BY timestamp DESC;
```

### Export Audit Report
```sql
SELECT 
  action,
  COUNT(*) as count,
  MIN(timestamp) as first_action,
  MAX(timestamp) as last_action
FROM import_audit_logs
GROUP BY action;
```

## 🐛 Troubleshooting

### Issue: Duplicates not detected
- Check field names match exactly
- Verify data normalization (phone numbers should be digits only)
- Review confidence thresholds in detection service

### Issue: Import hangs on large files
- Process files in batches
- Increase database query timeout
- Check network connection to Supabase

### Issue: Audit logs not saving
- Verify `import_audit_logs` table exists
- Check Supabase RLS policies
- Review browser console for errors

## 📦 Dependencies

- **React 19**: UI framework
- **TypeScript**: Type safety
- **TanStack Start**: Full-stack React framework
- **TanStack Query**: Data fetching and caching
- **Supabase**: Backend and database
- **Tailwind CSS**: Styling
- **Shadcn UI**: Component library
- **XLSX**: Spreadsheet parsing
- **Sonner**: Toast notifications

## 📄 License

MIT

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📞 Support

For issues or questions, please open a GitHub issue in this repository.
