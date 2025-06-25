#!/bin/bash

# Database Migration Script
# This script applies the schema reorganization changes

echo "🚀 Starting database schema reorganization..."
echo "📊 Current time: $(date)"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL and try again"
    exit 1
fi

echo "✅ DATABASE_URL is configured"

# Function to run SQL file
run_sql_file() {
    local file=$1
    local description=$2
    
    echo ""
    echo "📋 Running: $description"
    echo "📁 File: $file"
    
    if [ ! -f "$file" ]; then
        echo "❌ ERROR: File $file not found"
        return 1
    fi
    
    # Use psql to run the SQL file
    if command -v psql &> /dev/null; then
        psql "$DATABASE_URL" -f "$file"
        if [ $? -eq 0 ]; then
            echo "✅ Successfully applied: $description"
        else
            echo "❌ ERROR: Failed to apply $description"
            return 1
        fi
    else
        echo "❌ ERROR: psql command not found. Please install PostgreSQL client tools."
        return 1
    fi
}

# Run migrations in order
echo ""
echo "🔄 Step 1: Creating new applications schema..."
run_sql_file "migrations/001_create_applications_schema.sql" "Applications Schema Creation"

if [ $? -ne 0 ]; then
    echo "❌ Migration failed at step 1"
    exit 1
fi

echo ""
echo "🔄 Step 2: Updating alliance_chemical schema..."
run_sql_file "migrations/002_update_alliance_chemical_schema.sql" "Alliance Chemical Schema Update"

if [ $? -ne 0 ]; then
    echo "❌ Migration failed at step 2"
    exit 1
fi

echo ""
echo "🎉 Migration completed successfully!"
echo "📊 Completion time: $(date)"
echo ""
echo "📋 Next steps:"
echo "1. Test your application with: npm run build"
echo "2. Check database schema with your preferred DB client"
echo "3. If you have existing data, uncomment the data migration sections in the SQL files"
echo "4. After confirming everything works, you can drop the old tables"
echo ""
echo "🗄️  New schema structure:"
echo "   📁 applications.*"
echo "      ├── customer_applications"
echo "      ├── trade_references"
echo "      ├── digital_signatures"
echo "      ├── vendor_forms"
echo "      └── credit_approvals"
echo ""
echo "   📁 alliance_chemical.*"
echo "      ├── terms"
echo "      └── international_shipping_requests" 