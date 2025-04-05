import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import '../styles/CreateMeme.css';

// Sample company list - you would expand this or make it user-input
const COMPANIES = ['Atos', 'Endava', 'Luxoft'];

// Sample countries
const COUNTRIES = ['Romania', 'France'];

// Sample manager types
const MANAGER_TYPES = ['Micromanager', 'Clueless', 'Ghost', 'Tyrant', 'Passive-Aggressive'];

// Common meme categories (we'll extract these from API data when possible)
const DEFAULT_CATEGORIES = [
  'Popular', 'Reaction', 'Classic', 'Animals', 'TV & Movies', 'Gaming', 
  'Politics', 'Work', 'School', 'Social Media'
];

function CreateMeme() {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [managerQuote, setManagerQuote] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('Romania');
  const [managerType, setManagerType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textObjects, setTextObjects] = useState([]);
  const [textColor, setTextColor] = useState('white');
  const [fontSize, setFontSize] = useState(24);
  
  // New state for template search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedTemplates, setDisplayedTemplates] = useState([]);
  
  // API fetching state
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Category filtering
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [page, setPage] = useState(1);
  const templatesPerPage = 1;
  
  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: '#f0f0f0',
      preserveObjectStacking: true
    });
    
    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, []);
  
  // Fetch templates from API on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('https://api.memegen.link/templates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        
        const data = await response.json();
        
        // Extract categories from the data if available
        const allStyles = data
          .flatMap(template => template.styles || [])
          .filter(Boolean);
        
        const uniqueStyles = [...new Set(allStyles)];
        
        if (uniqueStyles.length > 0) {
          setCategories(['Popular', ...uniqueStyles]);
        }
        
        // Transform data to match your expected format
        const formattedTemplates = data.map(template => ({
          name: template.name,
          src: template.blank, // Using the blank template URL
          categories: template.styles || ['general'], // Using styles as categories if available
          id: template.id,
          example_url: template.example?.url || template.blank // Example with text, if available
        }));
        
        // Sort by popularity (if available) or alphabetically
        const sortedTemplates = formattedTemplates.sort((a, b) => a.name.localeCompare(b.name));
        
        setTemplates(sortedTemplates);
        
        // Initially filter for "Popular" category (we'll assume the first 20 are popular)
        setDisplayedTemplates(sortedTemplates.slice(0, 20));
      } catch (error) {
        console.error('Error fetching templates:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplates();
  }, []);
  
  // Filter templates when search query or category changes
  useEffect(() => {
    let filtered = [...templates];
    
    // Reset pagination when filter changes
    setPage(1);
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } 
    // Apply category filter if no search query and not "Popular"
    else if (selectedCategory !== 'Popular') {
      filtered = filtered.filter(template => 
        template.categories.includes(selectedCategory.toLowerCase())
      );
    } 
    // For "Popular" category, just take the first 20 when no search query
    else if (!searchQuery.trim() && selectedCategory === 'Popular') {
      filtered = templates.slice(0, 20);
    }
    
    setDisplayedTemplates(filtered);
  }, [searchQuery, selectedCategory, templates]);

  // Load template when selected
  const loadTemplate = (template) => {
    if (!canvas) {
      console.error('Canvas not initialized');
      return;
    }
    
    console.log('Loading template:', template.name, template.src);
    
    // Create a new image element to get the actual dimensions
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
      
      // Get the container width
      const containerWidth = canvasContainerRef.current ? canvasContainerRef.current.clientWidth : 500;
      
      // Calculate the aspect ratio of the image
      const aspectRatio = img.height / img.width;
      
      // Calculate new canvas dimensions based on the container width and aspect ratio
      const newWidth = Math.min(containerWidth, 500); // Limit max width to 500
      const newHeight = Math.round(newWidth * aspectRatio);
      
      // Update canvas dimensions
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);
      canvas.clear();
      canvas.backgroundColor = '#f0f0f0';
      
      // Create Fabric image with correct dimensions
      const fabricImage = new fabric.Image(img, {
        scaleX: 1,
        scaleY: 1,
        originX: 'center',
        originY: 'center',
        left: newWidth / 2,
        top: newHeight / 2,
        selectable: false,  // Change to false to prevent selection
        evented: false,     // Change to false to prevent any interaction
        lockMovementX: true, // Lock horizontal movement
        lockMovementY: true, // Lock vertical movement
        lockRotation: true,  // Lock rotation
        lockScalingX: true,  // Lock horizontal scaling
        lockScalingY: true,  // Lock vertical scaling
      });
      
      // Scale image to fit canvas while maintaining aspect ratio
      const scale = Math.min(
        newWidth / img.width,
        newHeight / img.height
      );
      
      fabricImage.scale(scale);
      
      console.log('Fabric image created:', fabricImage);
      
      // Add image to canvas
      canvas.add(fabricImage);
      canvas.renderAll();
      
      console.log('Canvas objects:', canvas.getObjects());
      
      setSelectedTemplate(template);
      
      // Save to recent templates in localStorage
      saveToRecentTemplates(template);
    };
    
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      alert('Failed to load template image. Please try again.');
    };
    
    // Start loading the image
    img.src = template.src;
  };
  
  // Save template to recent templates in localStorage
  const saveToRecentTemplates = (template) => {
    try {
      // Get existing recent templates or initialize empty array
      const recentTemplatesJSON = localStorage.getItem('recentTemplates') || '[]';
      const recentTemplates = JSON.parse(recentTemplatesJSON);
      
      // Check if template is already in recent list
      const existingIndex = recentTemplates.findIndex(t => t.name === template.name);
      if (existingIndex !== -1) {
        // Remove existing entry
        recentTemplates.splice(existingIndex, 1);
      }
      
      // Add new template to beginning of array
      recentTemplates.unshift(template);
      
      // Limit to 5 recent templates
      const limitedRecents = recentTemplates.slice(0, 5);
      
      // Save back to localStorage
      localStorage.setItem('recentTemplates', JSON.stringify(limitedRecents));
    } catch (error) {
      console.error('Error saving recent template:', error);
      // Fail silently - this is just a convenience feature
    }
  };
  
  // Get recent templates from localStorage
  const getRecentTemplates = () => {
    try {
      const recentTemplatesJSON = localStorage.getItem('recentTemplates') || '[]';
      return JSON.parse(recentTemplatesJSON);
    } catch (error) {
      console.error('Error getting recent templates:', error);
      return [];
    }
  };

  // Add text to canvas
  const addText = () => {
    if (!canvas || !managerQuote.trim()) return;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const text = new fabric.Textbox(managerQuote, {
      left: canvasWidth / 2,
      top: 50,
      width: Math.min(400, canvasWidth * 0.8),
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: textColor,
      stroke: textColor === 'white' ? 'black' : 'white',
      strokeWidth: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      padding: 10,
      textAlign: 'center',
      cornerColor: 'white',
      borderColor: 'white',
      editingBorderColor: 'blue',
      cornerSize: 12,
      selectable: true,
      evented: true,
      originX: 'center',
      originY: 'top',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    });
    
    canvas.add(text);
    setTextObjects(prev => [...prev, text]);
    canvas.setActiveObject(text);
    canvas.renderAll();
    
    // Clear the input field
    setManagerQuote('');
  };

  // Delete selected object
  const deleteSelected = useCallback(() => {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    
    if (activeObject) {
      canvas.remove(activeObject);
      setTextObjects(prev => prev.filter(obj => obj !== activeObject));
      canvas.renderAll();
    }
  }, [canvas]);

  // Handle key events for delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if we're not editing text
        if (canvas && 
            canvas.getActiveObject() && 
            !canvas.getActiveObject().isEditing) {
          deleteSelected();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, deleteSelected]);

  // Save meme to backend
  const saveMeme = async () => {
    if (!canvas || !company || !selectedTemplate || !country || !managerType) {
      alert('Please complete all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert canvas to blob
      const dataURL = canvas.toDataURL({ format: 'png' });
      const res = await fetch(dataURL);
      const blob = await res.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'meme.png');
      formData.append('company', company);
      formData.append('managerQuote', managerQuote || 'No text added');
      formData.append('template', selectedTemplate.name);
      formData.append('country', country);
      formData.append('managerType', managerType);
      
      // Send to backend
      const response = await fetch('http://localhost:1337/api/memes', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to save meme');
      }
      
      alert('Meme posted successfully!');
      
      // Reset all form fields
      setTextObjects([]);
      setCompany('');
      setManagerQuote('');
      setManagerType('');
      setCountry('Romania');
      setTextColor('white');
      setFontSize(24);
      canvas.clear();
      canvas.backgroundColor = '#f0f0f0';
      canvas.renderAll();
      setSelectedTemplate(null);
      
    } catch (error) {
      console.error('Error saving meme:', error);
      alert('Failed to save meme. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle pagination
  const handleNextPage = () => {
    setPage(prev => prev + 1);
  };
  
  const handlePrevPage = () => {
    setPage(prev => Math.max(1, prev - 1));
  };
  
  // Calculate pagination
  const paginatedTemplates = displayedTemplates.slice(
    (page - 1) * templatesPerPage,
    page * templatesPerPage
  );
  
  const totalPages = Math.ceil(displayedTemplates.length / templatesPerPage);

  // Get recent templates for display
  const recentTemplates = getRecentTemplates();

  return (
    <div className="create-meme-page">
      <h1>Create your boss or colleague rant meme!</h1>
      <p className="disclaimer">Remember: No real names, keep it legal, have fun!</p>
      
      <div className="meme-creator-container">
        <div className="template-selection">
          <h2>1. Choose a Template</h2>
          
          <div className="template-search-container">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="template-search"
            />
            
            {/* Replaced category buttons with a simple text indicator */}
            <div className="sorting-indicator">
              <span>Sorted by most popular</span>
            </div>
          </div>
          
          {isLoading ? (
            <p className="loading-message">Loading templates...</p>
          ) : error ? (
            <p className="error-message">Error: {error}</p>
          ) : (
            <>
              {recentTemplates.length > 0 && !searchQuery && (
                <div className="recent-templates">
                  <h3>Recently Used</h3>
                  <div className="templates-grid recent">
                    {recentTemplates.map((template) => (
                      <div 
                        key={`recent-${template.name}`}
                        className={`template-item ${selectedTemplate?.name === template.name ? 'selected' : ''}`}
                        onClick={() => loadTemplate(template)}
                      >
                        <img 
                          src={template.example_url || template.src} 
                          alt={template.name}
                          crossOrigin="anonymous"
                        />
                        <p>{template.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="templates-grid">
                {paginatedTemplates.map((template) => (
                  <div 
                    key={template.id || template.name}
                    className={`template-item ${selectedTemplate?.name === template.name ? 'selected' : ''}`}
                    onClick={() => loadTemplate(template)}
                  >
                    <img 
                      src={template.example_url || template.src} 
                      alt={template.name}
                      crossOrigin="anonymous"
                    />
                    <p>{template.name}</p>
                  </div>
                ))}
              </div>
              
              {displayedTemplates.length === 0 && (
                <p className="no-results">No templates found matching "{searchQuery}"</p>
              )}
              
              {displayedTemplates.length > templatesPerPage && (
                <div className="pagination-controls">
                  <button 
                    onClick={handlePrevPage} 
                    disabled={page === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {page} of {totalPages}
                  </span>
                  <button 
                    onClick={handleNextPage} 
                    disabled={page >= totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="canvas-container" ref={canvasContainerRef}>
          <h2>2. Design Your Meme</h2>
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} id="meme-canvas"></canvas>
          </div>
          
          <div className="text-controls">
            <textarea
              placeholder="What did your manager say? (e.g., 'We're like a family here')"
              value={managerQuote}
              onChange={(e) => setManagerQuote(e.target.value)}
              rows={3}
            />
            <div className="text-customization">
              <div className="customization-group">
                <label>Text Color:</label>
                <select 
                  value={textColor} 
                  onChange={(e) => setTextColor(e.target.value)}
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>
              <div className="customization-group">
                <label>Font Size:</label>
                <select 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))}
                >
                  <option value="16">Small</option>
                  <option value="24">Medium</option>
                  <option value="32">Large</option>
                  <option value="48">Extra Large</option>
                </select>
              </div>
            </div>
            <div className="text-buttons">
              <button 
                onClick={addText}
                disabled={!managerQuote.trim() || !selectedTemplate}
                className="add-text-btn"
              >
                Add Text
              </button>
              <button 
                onClick={deleteSelected} 
                className="delete-btn"
              >
                Delete Selected
              </button>
            </div>
            <p className="hint">Tip: Click and drag text to position. Resize using corner handles.</p>
          </div>
        </div>
        
        <div className="meme-details">
          <h2>3. Add Details</h2>
          
          <div className="form-group">
            <label>Company Name:</label>
            <select 
              value={company} 
              onChange={(e) => setCompany(e.target.value)}
              required
            >
              <option value="">Select a company</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="other">Other (specify in rant)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Country:</label>
            <select 
              value={country} 
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Manager Type:</label>
            <select 
              value={managerType} 
              onChange={(e) => setManagerType(e.target.value)}
              required
            >
              <option value="">Select manager type</option>
              {MANAGER_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="submit-meme-btn" 
            onClick={saveMeme}
            disabled={isSubmitting || !selectedTemplate || !company || !managerType}
          >
            {isSubmitting ? 'Submitting...' : 'Post Your Rant Meme'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateMeme;