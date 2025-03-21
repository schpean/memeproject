import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import '../styles/CreateMeme.css';

// Sample meme templates - you would expand this
const TEMPLATES = [
  { 
    name: 'Drake Hotline Bling', 
    src: 'https://api.memegen.link/images/doge/such/react/very/fabric' 
  },
  { 
    name: 'Distracted Boyfriend', 
    src: 'https://api.memegen.link/images/doge/such/meme/very/creator' 
  },
  { 
    name: 'Change My Mind', 
    src: 'https://api.memegen.link/images/doge/such/coding/very/fun' 
  },
  { 
    name: 'Two Buttons', 
    src: 'https://api.memegen.link/images/doge/such/buttons/very/choice' 
  },
  { 
    name: 'Expanding Brain', 
    src: 'https://api.memegen.link/images/doge/such/brain/very/expand' 
  },
  {
    name: 'Zero wing',
    src: 'https://api.memegen.link/images/zero-wing.jpg'
  }
];

// Sample company list - you would expand this or make it user-input
const COMPANIES = ['TechCorp', 'MegaRetail', 'CorporateInc', 'StartupXYZ'];

// Sample countries
const COUNTRIES = ['Romania', 'UK', 'Germany', 'France', 'USA'];

// Sample manager types
const MANAGER_TYPES = ['Micromanager', 'Clueless', 'Ghost', 'Tyrant', 'Passive-Aggressive'];

function CreateMeme() {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [managerQuote, setManagerQuote] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('Romania'); // Default to Romania as discussed
  const [managerType, setManagerType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textObjects, setTextObjects] = useState([]);

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

  // Load template when selected
  const loadTemplate = (template) => {
    if (!canvas) {
      console.error('Canvas not initialized');
      return;
    }
    
    console.log('Loading template:', template.name, template.src);
    
    // Clear canvas first
    canvas.clear();
    canvas.backgroundColor = '#f0f0f0';
    
    // Create a new image element
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
      
      // Create Fabric image
      const fabricImage = new fabric.Image(img, {
        scaleX: canvas.width / img.width,
        scaleY: canvas.height / img.height,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true
      });
      
      console.log('Fabric image created:', fabricImage);
      
      // Add image to canvas
      canvas.add(fabricImage);
      canvas.centerObject(fabricImage);
      canvas.renderAll();
      
      console.log('Canvas objects:', canvas.getObjects());
      
      setSelectedTemplate(template);
    };
    
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      alert('Failed to load template image. Please try again.');
    };
    
    // Start loading the image
    img.src = template.src;
  };

  // Add text to canvas
  const addText = () => {
    if (!canvas || !managerQuote.trim()) return;
    
    const text = new fabric.Textbox(managerQuote, {
      left: canvas.width / 2 - 200,
      top: 50,
      width: 400,
      fontSize: 24,
      fontWeight: 'bold',
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      padding: 10,
      textAlign: 'center',
      cornerColor: 'white',
      borderColor: 'white',
      editingBorderColor: 'blue',
      cornerSize: 12,
      selectable: true,
      evented: true
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
    if (!canvas || !company || !managerQuote || !selectedTemplate || !country || !managerType) {
      alert('Please complete all fields');
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
      formData.append('managerQuote', managerQuote);
      formData.append('template', selectedTemplate.name);
      formData.append('country', country);
      formData.append('managerType', managerType);
      
      // Send to backend
      const response = await fetch('http://localhost:5000/api/memes', {
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
      setManagerQuote(''); // Reset the quote
      setManagerType('');
      setCountry('Romania'); // Reset to default
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

  return (
    <div className="create-meme-page">
      <h1>Create Your Manager Rant Meme</h1>
      <p className="disclaimer">Remember: No real names, keep it legal, have fun!</p>
      
      <div className="meme-creator-container">
        <div className="template-selection">
          <h2>1. Choose a Template</h2>
          <div className="templates-grid">
            {TEMPLATES.map((template) => (
              <div 
                key={template.name}
                className={`template-item ${selectedTemplate?.name === template.name ? 'selected' : ''}`}
                onClick={() => loadTemplate(template)}
              >
                <img 
                  src={template.src} 
                  alt={template.name}
                  crossOrigin="anonymous"
                />
                <p>{template.name}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="canvas-container">
          <h2>2. Design Your Meme</h2>
          <canvas ref={canvasRef} id="meme-canvas"></canvas>
          
          <div className="text-controls">
            <textarea
              placeholder="What did your manager say? (e.g., 'We're like a family here')"
              value={managerQuote}
              onChange={(e) => setManagerQuote(e.target.value)}
              rows={3}
            />
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
            disabled={isSubmitting || !selectedTemplate || textObjects.length === 0 || !company || !managerType}
          >
            {isSubmitting ? 'Submitting...' : 'Post Your Rant Meme'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateMeme;