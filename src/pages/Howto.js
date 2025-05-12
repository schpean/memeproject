import React, { useState, useContext } from 'react';
import '../styles/Howto.css';
import { API_ENDPOINTS } from '../utils/config';
import AuthContext from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FaUpload, FaLink, FaBuilding, FaComment, FaExclamationTriangle, FaCity, FaInfoCircle } from 'react-icons/fa';

const Howto = () => {
  const { currentUser, loginWithGoogle } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state for required fields
  const [formData, setFormData] = useState({
    company: 'bossme.me', // Set bossme.me as default
    city: 'N/A' // Set N/A as default city since bossme.me is the default company
  });

  // Predefined options for dropdowns
  const companyOptions = [
    'bossme.me', // Add bossme.me as the first option
    'Adobe',
    'Amazon',
    'Apple',
    'Capgemini',
    'Dell',
    'Deloitte',
    'Endava (Romania)',
    'Google', 
    'Microsoft', 
    'UiPath', 
    'Bitdefender', 
    'Oracle', 
    'IBM', 
    'Atos',
    'Luxoft'
  ];
  
  const cityOptions = [
    'Bucuresti', 'Cluj-Napoca', 'Timisoara', 'Iasi', 'Brasov', 'Oradea'
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
    
    // If changing company to bossme.me, set city to a default value
    if (name === 'company' && value === 'bossme.me') {
      setFormData(prevData => ({
        ...prevData,
        [name]: value,
        city: 'N/A' // Set a default value for city when bossme.me is selected
      }));
    }
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
    // Check if company is provided
    if (!formData.company) {
      setError('Please select a company.');
      return false;
    }
    
    // If company is not bossme.me, require city
    if (formData.company !== 'bossme.me' && !formData.city) {
      setError('Please select a city.');
      return false;
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
        console.log('Form data being sent:', formData);
        Object.entries(formData).forEach(([key, value]) => {
          console.log(`Adding form field: ${key} = ${value}`);
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
        company: 'bossme.me',
        city: 'N/A'
      });
      setMessage('');
      
    } catch (error) {
      console.error('Error uploading meme:', error);
      
      // Show more details about the error
      if (error.message && error.message.includes('Server error')) {
        try {
          // Extract and parse the error JSON from the error message
          const errorMatch = error.message.match(/Server error: \d+ - (.+)$/);
          if (errorMatch && errorMatch[1]) {
            const errorJson = JSON.parse(errorMatch[1]);
            setError(`Upload failed: ${errorJson.error || error.message}`);
          } else {
            setError(error.message || 'Failed to upload meme. Please try again.');
          }
        } catch (parseError) {
          console.error('Error parsing error message:', parseError);
          setError(error.message || 'Failed to upload meme. Please try again.');
        }
      } else {
        setError(error.message || 'Failed to upload meme. Please try again.');
      }
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
        <div className="login-message">
          <h2>Login Required</h2>
          <p>To create and share memes, you need to be logged in. This helps us maintain a safe and respectful community.</p>
          <button className="login-button" onClick={loginWithGoogle}>
            Log in with Google
          </button>
          <div className="back-link">
            <Link to="/browse">Back to browse memes</Link>
          </div>
        </div>
      </div>
    );
  }

  // Main form for logged in users
  return (
    <div className="howto-page">
      <h1>How to Create a Meme</h1>
      
      <div className="moderation-notice">
        <FaInfoCircle className="info-icon" />
        <div className="notice-content">
          <h3>Moderation Notice</h3>
          <p>All memes are reviewed by our moderation team before being published. This applies to all users, regardless of login status. Thank you for your understanding!</p>
        </div>
      </div>
      
      <div className="reminder">
        <FaExclamationTriangle /> Remember: No real names, keep it legal, have fun!
      </div>
      
      <div className="howto-step">
        <h2>Choose your meme source</h2>
        <p>
          Visit <a href="https://imgflip.com" target="_blank" rel="noopener noreferrer" className="imgflip-link">
            Imgflip
          </a> to create the next meme. When you are done, copy the URL or download the image.
        </p>
        
        <div className="upload-options">
          <div className="option-container">
            <h3><FaUpload /> Option 1: Upload from your device</h3>
            <div className="file-upload-area">
              <div className="upload-icon">
                <FaUpload />
              </div>
              <div className="upload-text">Click or drag to upload an image</div>
              <div className="upload-hint">JPEG, PNG, or GIF format (max 5MB)</div>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/gif" 
                onChange={handleFileChange} 
              />
            </div>
          </div>
          
          <div className="option-container">
            <h3><FaLink /> Option 2: Use an Imgflip URL</h3>
            <div className="imgflip-instructions">
              Paste an Imgflip URL (e.g., https://imgflip.com/i/9pv2ly)
            </div>
            <input
              type="text"
              className="url-input"
              placeholder="Enter Imgflip URL"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setFile(null); // Clear file when URL is entered
              }}
            />
          </div>
        </div>
        
        {/* Preview image if available */}
        {(file || imageUrl) && (
          <div className="image-preview">
            <div className="preview-label">Preview:</div>
            {file ? (
              <img src={getFilePreviewUrl()} alt="Preview" />
            ) : imageUrl ? (
              <img src={transformImgflipUrl(imageUrl)} alt="Preview" />
            ) : null}
          </div>
        )}
      </div>
      
      <div className="howto-step">
        <h2>Fill in meme details</h2>
        
        <div className="form-group">
          <label htmlFor="company"><FaBuilding /> Company</label>
          <select
            id="company"
            name="company"
            className="form-select"
            value={formData.company}
            onChange={handleFormChange}
          >
            {companyOptions.map(company => (
              <option key={company} value={company} className={company === 'bossme.me' ? 'bossme-option' : ''}>
                {company === 'bossme.me' ? 'bossme.me' : company}
              </option>
            ))}
          </select>
          {formData.company === 'bossme.me' && (
            <div className="bossme-description">
              <em>memes that don't fit any company</em>
            </div>
          )}
        </div>
        
        {/* Only show city field if bossme.me is not selected */}
        {formData.company !== 'bossme.me' && (
          <div className="form-group">
            <label htmlFor="city"><FaCity /> City</label>
            <select
              id="city"
              name="city"
              className="form-select"
              value={formData.city}
              onChange={handleFormChange}
            >
              <option value="">Select a city</option>
              {cityOptions.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="message"><FaComment /> Message (optional)</label>
          <textarea
            id="message"
            className="form-textarea"
            placeholder="Add a caption or message to go with your meme..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        
        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Meme'}
        </button>
      </div>
    </div>
  );
};

export default Howto;