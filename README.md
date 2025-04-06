# Meme Website

A platform for sharing and rating company memes.

## Features

- Browse and search memes by company and location
- Create and upload new memes
- Upvote and comment on memes
- User authentication with Google

## New Features

### Email Verification

The application now includes email verification for new user accounts. This feature:

1. Sends verification emails to users when they register
2. Provides a verification link that expires after 24 hours
3. Sends welcome emails after successful verification
4. Shows verification status in the UI
5. Allows users to request new verification emails

To configure email settings, update the following variables in your `.env` file:

```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=no-reply@yourdomain.com
```

For Gmail, you'll need to:
1. Use `smtp.gmail.com` as the host
2. Create an "App Password" in your Google Account security settings
3. Use the App Password instead of your regular password

### Role-Based Access Control

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
   
3. Set up the database:
   - Make sure PostgreSQL is installed and running
   - Create a new database: `createdb meme_db`
   - Run the schema: `psql meme_db < server/schema.sql`
   
4. Configure environment variables:
   - Copy `.env.example` to `.env` and update the values

5. Start development servers:
   - Frontend: `npm start` (runs on port 3000)
   - Backend: `cd server && node server.js` (runs on port 1337)

## Deployment Guide

### Prerequisites
- A domain name (e.g., bossme.me)
- Web server (Nginx or Apache)
- PostgreSQL database server
- Node.js and npm
- SSL certificate (recommended for production)

### Deployment Steps

1. **Update Google OAuth Configuration**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Credentials
   - Update the authorized JavaScript origins and redirect URIs:
     - Add your production domain (https://bossme.me)
     - Add the callback URL (https://bossme.me/auth/google/callback)

2. **Prepare Environment Variables**:
   - Create `.env` file based on `.env.example`
   - Update for production:
     ```
     # Database settings
     DB_USER=postgres
     DB_PASSWORD=your_secure_password
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=meme_db
     PORT=1337

     # Production URLs
     REACT_APP_API_BASE_URL=https://api.bossme.me  # or https://bossme.me/api
     REACT_APP_CLIENT_BASE_URL=https://bossme.me
     CLIENT_BASE_URL=https://bossme.me
     PRODUCTION_CLIENT_URL=https://bossme.me

     # Google OAuth
     REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
     REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret
     ```

3. **Build the Frontend**:
   ```
   npm run build
   ```
   
4. **Set Up Web Server**:
   
   Example Nginx configuration for both frontend and API:
   ```
   # Frontend - bossme.me
   server {
       listen 80;
       server_name bossme.me www.bossme.me;
       
       # Redirect to HTTPS
       return 301 https://$host$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name bossme.me www.bossme.me;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/certificate.key;
       
       root /var/www/bossme/build;
       index index.html;
       
       # Always serve index.html for any non-API request
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Proxy API requests to the Node.js server
       location /api/ {
           proxy_pass http://localhost:1337/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
       
       # Serve uploaded files
       location /uploads/ {
           alias /var/www/bossme/server/uploads/;
           add_header Access-Control-Allow-Origin *;
       }
   }
   
   # API subdomain - api.bossme.me
   server {
       listen 80;
       server_name api.bossme.me;
       
       # Redirect to HTTPS
       return 301 https://$host$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name api.bossme.me;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/certificate.key;
       
       location / {
           proxy_pass http://localhost:1337;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Start Backend Server with PM2** (keeps it running):
   ```
   npm install -g pm2
   cd server
   pm2 start server.js --name meme-api
   pm2 save
   pm2 startup
   ```

6. **Database Backup Strategy** (recommended):
   ```
   # Create a backup script (backup.sh)
   #!/bin/bash
   DB_NAME="meme_db"
   BACKUP_DIR="/var/backups/postgres"
   DATE=$(date +%Y-%m-%d_%H-%M-%S)
   
   mkdir -p $BACKUP_DIR
   pg_dump $DB_NAME > $BACKUP_DIR/$DB_NAME-$DATE.sql
   
   # Keep only the last 7 backups
   ls -t $BACKUP_DIR/*.sql | tail -n +8 | xargs rm -f
   ```

7. **File Uploads**:
   - Ensure the `uploads` directory exists and has proper permissions:
   ```
   mkdir -p /var/www/bossme/server/uploads
   chown -R www-data:www-data /var/www/bossme/server/uploads
   chmod -R 755 /var/www/bossme/server/uploads
   ```

## Troubleshooting

- **Images not loading**: Check CORS settings in server.js and ensure the uploads directory exists and is accessible
- **Authentication errors**: Verify Google OAuth configuration and callback URLs
- **Database connection issues**: Check DB credentials and ensure PostgreSQL is running

## License

MIT
