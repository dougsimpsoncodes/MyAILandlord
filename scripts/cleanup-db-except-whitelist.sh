#!/bin/bash
# ============================================================================
# Script: Cleanup Database Except Whitelisted Users
# Description: Deletes all users and related data EXCEPT specified emails
# Usage: ./scripts/cleanup-db-except-whitelist.sh
# ============================================================================

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
  source .env
else
  echo "Error: .env file not found"
  exit 1
fi

# Database connection string
DB_URL="postgresql://postgres.${SUPABASE_DB_HOST#*@}:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/postgres"

echo "======================================"
echo "Database Cleanup (Whitelist Mode)"
echo "======================================"
echo ""
echo "This will DELETE all users and related data EXCEPT:"
echo "  - landlord@test.com"
echo "  - g@a.com"
echo ""
echo "To modify the whitelist, edit:"
echo "  scripts/cleanup-db-except-whitelist.sql"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Running cleanup..."
echo ""

# Run the SQL script
PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql "$DB_URL" -f scripts/cleanup-db-except-whitelist.sql

echo ""
echo "✓ Cleanup complete!"
echo ""
