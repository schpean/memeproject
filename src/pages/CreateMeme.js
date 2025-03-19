import React, { useEffect, useState, useRef } from 'react';
import { Canvas, Image, Textbox } from 'fabric';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import '../styles/CreateMeme.css';

// Sample meme templates - you would expand this
const TEMPLATES = [
  { name: 'Distracted Boyfriend', src: '/templates/distracted-boyfriend.jpg' },
  { name: 'Drake Hotline Bling', src: '/templates/drake.jpg' },
  { name: 'Change My Mind', src: '/templates/change-my-mind.jpg' },
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

  // Initialize canvas
  useEffect(() => {
    const canvas = new Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: '#f0f0f0',
    });
    
    setCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load template when selected
  const loadTemplate = (template) => {
    if (!canvas) return;
    
    // Clear canvas
    canvas.clear();
    
    Image.fromURL(template.src, (img) => {
      // Scale image to fit canvas
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      img.scaleX = scale;
      img.scaleY = scale;
      
      // Center image
      canvas.add(img);
      canvas.centerObject(img);
      canvas.renderAll();
      
      setSelectedTemplate(template);
    });
  };

  // Add text to canvas
  const addText = () => {
    if (!canvas || !managerQuote.trim()) return;
    
    const text = new Textbox(managerQuote, {
      left: 50,
      top: 50,
      width: 400,
      fontSize: 20,
      fill: 'white',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 10,
      textAlign: 'center',
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // Save meme to Firebase
  const saveMeme = async () => {
    if (!canvas || !company || !managerQuote || !selectedTemplate || !country || !managerType) {
      alert('Please complete all fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert canvas to dataURL
      const dataURL = canvas.toDataURL({ format: 'png' });
      
      // Convert dataURL to blob
      const res = await fetch(dataURL);
      const blob = await res.blob();
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `memes/${Date.now()}.png`);
      const uploadResult = await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(uploadResult.ref);
      
      // Save metadata to Firestore
      await addDoc(collection(db, 'memes'), {
        imageUrl,
        company,
        managerQuote,
        template: selectedTemplate.name,
        country,
        managerType,
        votes: 0,
        createdAt: serverTimestamp(),
      });
      
      alert('Meme posted successfully!');
      
      // Reset form
      setManagerQuote('');
      setCompany('');
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
                <img src={template.src} alt={template.name} />
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
            <button onClick={addText}>Add Text</button>
          </div>
        </div>
        
        <div className="meme-details">
          <h2>3. Add Details</h2>
          
          <div className="form-group">
            <label>Company Name:</label>
            <select 
              value={company} 
              onChange={(e) => setCompany(e.target.value)}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Post Your Rant Meme'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateMeme;