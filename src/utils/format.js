/**
 * Format a number for display, showing actual digits up to 999, then using k notation.
 * Examples: 
 * - 645 remains "645"
 * - 1000 becomes "1k"
 * - 1500 becomes "1.5k" 
 * - 15000 becomes "15k"
 * - 1000000 becomes "1M"
 * @param {number} num - The number to format
 * @return {string} The formatted number
 */
export const formatCount = (num) => {
  if (num === null || num === undefined) return '0';
  
  // Convert to number if string
  const count = typeof num === 'string' ? parseInt(num, 10) : num;
  
  // Handle irregular values
  if (isNaN(count)) return '0';
  
  // Less than 1000, just return the number
  if (count < 1000) return count.toString();
  
  // For thousands (k)
  if (count < 1000000) {
    const thousands = count / 1000;
    // Only show decimal if not a whole number of k
    if (Math.floor(thousands) === thousands) {
      return `${thousands}k`;
    }
    // Show one decimal place for thousands
    return `${thousands.toFixed(1)}k`.replace('.0k', 'k');
  }
  
  // For millions (M)
  const millions = count / 1000000;
  if (Math.floor(millions) === millions) {
    return `${millions}M`;
  }
  return `${millions.toFixed(1)}M`.replace('.0M', 'M');
};

/**
 * Format a date in a readable format
 * @param {string|Date} date - The date to format
 * @return {string} The formatted date
 */
export const formatDate = (date) => {
  if (!date) return 'Unknown date';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'Invalid date';
  }
};

/**
 * Format a time difference into a "time ago" format
 * @param {string|Date} date - The date to get time ago from
 * @return {string} The formatted time ago string
 */
export const formatTimeAgo = (date) => {
  if (!date) return 'Unknown time';
  
  try {
    const now = new Date();
    const pastDate = new Date(date);
    const diffMs = now - pastDate;
    
    // Convert to seconds
    const diffSec = Math.floor(diffMs / 1000);
    
    // Less than a minute
    if (diffSec < 60) {
      return 'just now';
    }
    
    // Minutes (less than an hour)
    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    }
    
    // Hours (less than a day)
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Days (less than a week)
    if (diffSec < 604800) {
      const days = Math.floor(diffSec / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Just use the date format for older dates
    return formatDate(date);
  } catch (e) {
    return 'Unknown time';
  }
}; 