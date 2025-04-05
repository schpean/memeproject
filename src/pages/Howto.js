import React, { useState, useContext } from 'react';
import '../styles/Howto.css'; // Import the CSS file
import { API_ENDPOINTS } from '../utils/config';
import AuthContext from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Howto = () => {
  const { currentUser, loginWithGoogle } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state for required fields (simplified to only company, country, and votes)
  const [formData, setFormData] = useState({
    company: '',
    country: '',
    votes: ''
  });

  // Predefined options for dropdowns
  const companyOptions = [
    'Atos', 'Luxcoif', 'Oracle', 'Bitdefender'
  ];
  
  const countryOptions = [
    'Romania', 'Germany', 'France',
  ];
  
  // Add a message state variable
  const [message, setMessage] = useState('');

  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    // Check file size and type
    if (selectedFile) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      
      if (selectedFile.size > maxSize) {
        setError('File size exceeds 5MB limit.');
        setFile(null);
      } else if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only JPEG, PNG, and GIF formats are allowed.');
        setFile(null);
      } else {
        setError('');
        setFile(selectedFile);
        setImageUrl(''); // Clear image URL when file is selected
      }
    }
  };

  // Transform imgflip URL to direct image URL
  const transformImgflipUrl = (url) => {
    if (!url) return '';
    
    // Check if it's an imgflip.com URL with the pattern /i/[identifier]
    if (url.includes('imgflip.com/i/')) {
      // Extract the identifier using regex
      const match = url.match(/imgflip\.com\/i\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        const identifier = match[1];
        return `https://i.imgflip.com/${identifier}.jpg`;
      }
    }
    // Return original URL if it doesn't match the pattern
    return url;
  };

  // Validate all required fields are filled
  const validateForm = () => {
    const requiredFields = ['company', 'country'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please select a ${field}.`);
        return false;
      }
    }
    return true;
  };

  const handleUpload = async () => {
    setError('');
    setSuccessMessage('');
    
    // Validate form fields
    if (!validateForm()) {
      return;
    }

    // Check if either file or URL is provided
    if (!file && !imageUrl) {
      setError('Please upload a file or provide an image URL.');
      return;
    }

    setUploading(true);
    
    try {
      let data;
      let uploadMethod;
      
      // Debug information about current user
      console.log('Current user from context:', currentUser);
      
      // Get user information directly from localStorage as a backup
      let userInfo = null;
      const storedUser = localStorage.getItem('memeUser');
      if (storedUser) {
        try {
          userInfo = JSON.parse(storedUser);
          console.log('User from localStorage:', userInfo);
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
      
      // Determine which user info to use (context or localStorage)
      const userId = currentUser?.uid || userInfo?.uid;
      const username = currentUser?.username || userInfo?.username || currentUser?.displayName || userInfo?.displayName;
      
      console.log('Using userId:', userId);
      console.log('Using username:', username);
      
      if (file) {
        // If uploading a file
        uploadMethod = 'file';
        const formDataToSend = new FormData();
        formDataToSend.append('image', file);
        
        // Add all required form fields
        Object.entries(formData).forEach(([key, value]) => {
          formDataToSend.append(key, value);
        });
        
        // Update the FormData section in the handleSubmit function
        formDataToSend.append('message', message);
        
        // Add user information if available
        if (userId && username) {
          formDataToSend.append('userId', userId);
          formDataToSend.append('username', username);
          console.log('Added user info to FormData:', userId, username);
        } else {
          console.log('No user info available for FormData');
        }
        
        data = formDataToSend;
        console.log('Uploading file:', file.name);
      } else if (imageUrl) {
        // If using a URL, transform it if it's an imgflip URL
        const transformedUrl = transformImgflipUrl(imageUrl);
        console.log('Debug - Transformed URL:', transformedUrl);
        
        uploadMethod = 'url';
        
        // For URL uploads, we'll use JSON format with the image_url field
        const jsonData = {
          ...formData,
          image_url: transformedUrl,
          message: message
        };
        
        // Add user information if available
        if (userId && username) {
          jsonData.userId = userId;
          jsonData.username = username;
          console.log('Added user info to JSON payload:', userId, username);
        } else {
          console.log('No user info available for JSON payload');
        }
        
        data = JSON.stringify(jsonData);
        
        console.log('Debug - JSON payload:', data);
      }
      
      // Send the request to the server
      console.log('Sending request to server...');
      
      const response = await fetch(API_ENDPOINTS.memes, {
        method: 'POST',
        headers: uploadMethod === 'url' ? {
          'Content-Type': 'application/json'
        } : undefined, // No content-type header for FormData (multipart/form-data)
        body: data,
      });
      
      console.log('Server response status:', response.status);
      
      // Get the response text first
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // Try to parse it as JSON if it looks like JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.log('Response is not JSON');
        result = { message: responseText };
      }
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} - ${JSON.stringify(result)}`);
      }
      
      setSuccessMessage('Meme uploaded successfully!');
      console.log('Uploaded meme:', result);
      
      // Clear form after successful upload
      setFile(null);
      setImageUrl('');
      setFormData({
        company: '',
        country: ''
      });
      
    } catch (error) {
      console.error('Error uploading meme:', error);
      setError(error.message || 'Failed to upload meme. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Create a URL for a file to display preview
  const getFilePreviewUrl = () => {
    if (file) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Render login required message
  if (!currentUser) {
    return (
      <div className="howto-page login-required">
        <h1>Login Required</h1>
        <div className="login-message">
          <p>You must be logged in to create memes.</p>
          <p>Please log in with your Google account to continue.</p>
          <button className="login-button" onClick={loginWithGoogle}>
            Login with Google
          </button>
          <p className="back-link">
            <Link to="/">Return to Home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="howto-page">
      <h1>How to Create Your Meme</h1>
      <p className="disclaimer">Remember: No real names, keep it legal, have fun!</p>
      
      <div className="instructions">
        <h2>Step 1: Choose your meme source</h2>
        <p>
          Visit <a href="https://imgflip.com" target="_blank" rel="noopener noreferrer">Imgflip</a> to create or find memes
        </p>
        <p>
          When you find a meme you like, copy the URL (e.g., https://imgflip.com/i/9pv2ly) or download the image.
        </p>
      </div>
      
      <div className="upload-section">
        <h3>Option 1: Upload from your device</h3>
        <p>
          Please ensure that your image is in JPEG, PNG, or GIF format and does not exceed 5MB in size.
        </p>
        <input 
          type="file" 
          accept=".jpg, .jpeg, .png, .gif" 
          onChange={handleFileChange} 
        />
        
        <h3>Option 2: Use an Imgflip URL</h3>
        <p>
          Paste an Imgflip URL (e.g., https://imgflip.com/i/9pjt7s)
        </p>
        <input 
          type="text" 
          placeholder="Enter Imgflip URL" 
          value={imageUrl} 
          onChange={(e) => {
            setImageUrl(e.target.value);
            setFile(null); // Clear file when URL is entered
          }} 
        />
        
        {/* Preview section */}
        <div className="preview-section">
          {(file || imageUrl) && (
            <div>
              <h3>Preview</h3>
              {file && (
                <img 
                  src={getFilePreviewUrl()} 
                  alt="Preview" 
                  style={{ maxWidth: '300px', maxHeight: '300px' }} 
                />
              )}
              {!file && imageUrl && (
                <img 
                  src={transformImgflipUrl(imageUrl)} 
                  alt="Preview" 
                  style={{ maxWidth: '300px', maxHeight: '300px' }} 
                  onError={() => setError('Unable to load image from this URL')}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="meme-details">
        <h2>Step 2: Fill in meme details</h2>
        
        <div className="form-group">
          <label>Company</label>
          <select 
            name="company" 
            value={formData.company} 
            onChange={handleFormChange}
          >
            <option value="">Select a company</option>
            {companyOptions.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Country</label>
          <select 
            name="country" 
            value={formData.country} 
            onChange={handleFormChange}
          >
            <option value="">Select a country</option>
            {countryOptions.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Message (optional)</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message to go with your meme"
            rows="4"
          ></textarea>
        </div>
      </div>
      
      <div className="submission">
        <button 
          onClick={handleUpload} 
          disabled={uploading || (!file && !imageUrl)}
        >
          {uploading ? 'Uploading...' : 'Upload Meme'}
        </button>
        
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
      </div>
      
      {uploading && (
        <div className="debug-section">
          <h3>Debug Information</h3>
          <pre>
            {imageUrl && `Transformed URL: ${transformImgflipUrl(imageUrl)}\n`}
            {file ? `Uploading File: ${file.name}` : imageUrl ? `Uploading URL: ${transformImgflipUrl(imageUrl)}` : 'No file or URL selected'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Howto;