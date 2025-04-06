/**
 * Cleanup script to remove temporary and unnecessary files
 * Run with: node cleanup.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configure paths to clean
const pathsToClean = [
  // Build artifacts
  'build/static/js/*.map',
  'build/static/css/*.map',
  
  // Temporary files
  '.DS_Store',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  
  // Test files
  'src/**/*.test.js',
  'src/setupTests.js',
  
  // Misc
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local'
];

// Log helper
function log(message) {
  console.log(`[Cleanup] ${message}`);
}

// Clean function
function cleanup() {
  log('Starting cleanup process...');
  
  // Process each path
  pathsToClean.forEach(pattern => {
    try {
      // For simple file patterns
      if (!pattern.includes('*')) {
        if (fs.existsSync(pattern)) {
          fs.unlinkSync(pattern);
          log(`Removed file: ${pattern}`);
        }
      } else {
        // For glob patterns, use find command
        const baseDir = pattern.split('/')[0];
        const searchPattern = pattern.split('/').slice(1).join('/');
        
        if (fs.existsSync(baseDir)) {
          // Use PowerShell to find and remove files on Windows
          const command = `powershell "Get-ChildItem -Path '${baseDir}' -Recurse -Filter '${searchPattern}' | Remove-Item -Force"`;
          execSync(command);
          log(`Removed files matching: ${pattern}`);
        }
      }
    } catch (error) {
      log(`Error processing ${pattern}: ${error.message}`);
    }
  });
  
  // Clean uploads older than 30 days
  if (fs.existsSync('server/uploads')) {
    try {
      log('Cleaning old upload files (>30 days)...');
      const now = Date.now();
      const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      
      const files = fs.readdirSync('server/uploads');
      
      files.forEach(file => {
        if (file === '.gitkeep') return; // Preserve .gitkeep
        
        const filePath = path.join('server/uploads', file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > MAX_AGE) {
          fs.unlinkSync(filePath);
          log(`Removed old upload: ${file}`);
        }
      });
    } catch (error) {
      log(`Error cleaning uploads: ${error.message}`);
    }
  }
  
  log('Cleanup complete!');
}

// Run cleanup
cleanup(); 