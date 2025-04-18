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

## Autentificare Agnostică

### Sistem de identificare a utilizatorilor

Aplicația folosește un sistem complet agnostic față de metodele de autentificare, prin utilizarea unui identificator unic intern (UUID) pentru fiecare utilizator, indiferent de metoda de autentificare folosită.

Acest sistem rezolvă următoarele probleme:

1. **Independența de provideri**: Identificarea utilizatorilor este independentă de providerii de autentificare
2. **Flexibilitate în schimbarea metodelor**: Utilizatorii pot folosi metode diferite de autentificare fără a pierde datele
3. **Consistență în API-uri**: Toate API-urile folosesc același identificator unic
4. **Securitate îmbunătățită**: ID-urile nu expun informații despre providerul de autentificare

### Implementare

- Fiecare utilizator primește un `public_id` (UUID) generat intern 
- Acest `public_id` este folosit ca identificator principal în toate API-urile
- În frontend, acest `public_id` este stocat în `currentUser.uid`
- Aplicația păstrează asocierea între `public_id` și credențialele specifice providerilor (Google ID, Apple ID, etc.)

### Beneficii

- Permite migrarea între provideri fără pierdere de date
- Permite implementarea ușoară a noi metode de autentificare
- Uniformizează manipularea utilizatorilor în întreaga aplicație
- Permite utilizatorilor să-și conecteze multiple metode de autentificare la același cont

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
- AWS Account
- Domain name (bossme.me)
- AWS Lightsail instance ($10 plan recommended)
- AWS SES configured for email

### Deployment Steps

1. **Prepare Your Application**
   ```bash
   # Make the deployment script executable
   chmod +x deploy.sh
   
   # Run the deployment script
   ./deploy.sh
   ```

2. **Set Up AWS Lightsail Instance**
   - Create a new instance with Ubuntu
   - Choose the $10 plan (1 GB RAM, 2 vCPUs, 40 GB SSD)
   - Select your preferred region
   - Choose Ubuntu 20.04 LTS
   - Create instance

3. **Configure Your Instance**
   ```bash
   # Connect to your instance
   ssh -i your-key.pem ubuntu@your-instance-ip

   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib

   # Create database and user
   sudo -u postgres psql
   CREATE DATABASE meme_db;
   CREATE USER your_production_db_user WITH PASSWORD 'your_secure_production_password';
   GRANT ALL PRIVILEGES ON DATABASE meme_db TO your_production_db_user;
   \q

   # Create application directory
   mkdir -p /home/ubuntu/bossme
   ```

4. **Deploy Your Application**
   ```bash
   # From your local machine, upload the deployment package
   scp -i your-key.pem -r deploy/* ubuntu@your-instance-ip:/home/ubuntu/bossme/

   # On the instance, set up the service
   sudo mv /home/ubuntu/bossme/bossme.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable bossme
   sudo systemctl start bossme
   ```

5. **Configure Domain**
   - Go to your domain registrar
   - Add an A record pointing to your Lightsail instance IP
   - Add a CNAME record for www subdomain
   - Wait for DNS propagation (can take up to 48 hours)

6. **Set Up SSL**
   ```bash
   # Install Certbot
   sudo apt install -y certbot python3-certbot-nginx

   # Get SSL certificate
   sudo certbot --nginx -d bossme.me -d www.bossme.me
   ```

7. **Monitor Your Application**
   ```bash
   # Check application status
   sudo systemctl status bossme

   # View logs
   sudo journalctl -u bossme -f
   ```

### Environment Variables
Make sure to update the following in your `.env.production`:
- Database credentials
- Google OAuth credentials
- AWS SES credentials
- JWT and session secrets
- Domain settings

### Maintenance
- Regular backups of the database
- Monitor disk space and memory usage
- Keep Node.js and npm packages updated
- Monitor error logs

## Troubleshooting

- **Images not loading**: Check CORS settings in server.js and ensure the uploads directory exists and is accessible
- **Authentication errors**: Verify Google OAuth configuration and callback URLs
- **Database connection issues**: Check DB credentials and ensure PostgreSQL is running

## License

MIT
