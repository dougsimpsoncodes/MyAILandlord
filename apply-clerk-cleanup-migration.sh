#!/bin/bash

# Apply Clerk function cleanup migration
# This script removes legacy Clerk-based database functions and replaces them with UUID-based versions

set -e

echo "🔧 Applying Clerk cleanup migration..."
echo ""
echo "This will:"
echo "  1. Drop legacy clerk_id_to_uuid function"
echo "  2. Update validate_property_code to use UUID"
echo "  3. Update link_tenant_to_property to use UUID"
echo ""

# Project details
PROJECT_REF="zxqhxjuwmkxevhkpqfzf"
DB_HOST="db.${PROJECT_REF}.supabase.co"

# Prompt for password securely
echo -n "Enter your Supabase database password: "
read -s DB_PASSWORD
echo ""

# Construct connection string
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:5432/postgres"

# Apply migration
echo ""
echo "📝 Applying migration file: supabase/migrations/20250115_update_property_code_rpcs.sql"
PGPASSWORD="${DB_PASSWORD}" psql "${DATABASE_URL}" -f supabase/migrations/20250115_update_property_code_rpcs.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Regenerate Supabase types"
    echo "  2. Verify no Clerk references remain"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
