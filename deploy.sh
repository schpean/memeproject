#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment process..."

# Build the React application
echo "📦 Building React application..."
npm run build

# Create a deployment package
echo "📦 Creating deployment package..."
mkdir -p deploy
cp -r build server package.json package-lock.json .env.production deploy/

# Create a production start script
echo "📝 Creating production start script..."
cat > deploy/start.sh << 'EOL'
#!/bin/bash
export NODE_ENV=production
npm install --production
node server/server.js
EOL

chmod +x deploy/start.sh

# Create a systemd service file
echo "📝 Creating systemd service file..."
cat > deploy/bossme.service << 'EOL'
[Unit]
Description=BossMe.me Web Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/bossme
ExecStart=/home/ubuntu/bossme/start.sh
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

echo "✅ Deployment package created successfully!"
echo "📦 Your deployment package is in the 'deploy' directory"
echo "🚀 Next steps:"
echo "1. Create an AWS Lightsail instance"
echo "2. Upload the contents of the 'deploy' directory to /home/ubuntu/bossme"
echo "3. Install Node.js and PostgreSQL on the instance"
echo "4. Set up the systemd service"
echo "5. Configure your domain (bossme.me) to point to your instance" 