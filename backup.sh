#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.production

# Configuration
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/meme_db_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
echo "📦 Creating database backup..."
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
echo "🗜️ Compressing backup..."
gzip $BACKUP_FILE

# Keep only the last 7 backups
echo "🧹 Cleaning up old backups..."
ls -t $BACKUP_DIR/*.sql.gz | tail -n +8 | xargs rm -f

echo "✅ Backup completed successfully!"
echo "📁 Backup location: $BACKUP_FILE.gz" 