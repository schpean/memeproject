import fetch from 'node-fetch';

// API endpoint URL - use the same one the frontend uses
const API_URL = 'http://86.120.25.207:1337/memes';

async function testAPI() {
  console.log('Testing API connection to:', API_URL);
  
  try {
    // Try to fetch memes from the API
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('Number of memes received:', data.length);
    
    if (data.length > 0) {
      console.log('First meme data:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('WARNING: No memes found in database!');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching memes:', error.message);
    return null;
  }
}

// Run the test
testAPI(); 