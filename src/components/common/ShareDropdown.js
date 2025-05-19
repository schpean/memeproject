import React, { useState, useRef, useEffect } from 'react';
import { FaShare } from 'react-icons/fa';
import { notify } from './Notification';
import './styles/ShareDropdown.css';

/**
 * Componentă pentru butonul de share cu dropdown
 * Oferă opțiuni pentru partajare pe Facebook, WhatsApp, X/Twitter și copiere link
 */
const ShareDropdown = ({ url, title = '', message = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Log pentru debugging
  useEffect(() => {
    console.log('Common ShareDropdown mounted with URL:', url);
  }, [url]);

  // Actualizare poziție dropdown la scroll
  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
      const updatePosition = () => {
        const button = buttonRef.current;
        const dropdown = dropdownRef.current;
        
        if (button && dropdown) {
          const rect = button.getBoundingClientRect();
          
          // Actualizăm poziția pentru desktop
          if (window.innerWidth > 768) {
            dropdown.style.top = `${rect.bottom + window.scrollY + 5}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;
          }
        }
      };
      
      // Adăugăm event listener pentru scroll
      window.addEventListener('scroll', updatePosition);
      
      // Cleanup
      return () => {
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isOpen]);

  // Efect pentru poziționarea dropdownului
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const button = buttonRef.current;
      const rect = button.getBoundingClientRect();
      
      // Creăm un portal pentru dropdown direct în body
      const dropdown = document.createElement('div');
      dropdown.className = 'share-dropdown-portal';
      dropdown.style.position = 'absolute';
      dropdown.style.zIndex = '999999';
      dropdown.style.backgroundColor = '#fff';
      dropdown.style.border = '1px solid #eaeaea';
      dropdown.style.borderRadius = '8px';
      dropdown.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      dropdown.style.padding = '8px';
      dropdown.style.minWidth = '180px';
      
      // Calculăm poziția pentru desktop (în partea de jos a butonului)
      if (window.innerWidth > 768) {
        dropdown.style.top = `${rect.bottom + window.scrollY + 5}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
      } else {
        // Pe mobil afișăm la baza ecranului
        dropdown.style.position = 'fixed';
        dropdown.style.bottom = '0';
        dropdown.style.left = '0';
        dropdown.style.right = '0';
        dropdown.style.width = '100%';
        dropdown.style.borderRadius = '12px 12px 0 0';
        dropdown.style.padding = '16px';
      }
      
      // Opțiuni dropdown cu icoane inline SVG
      const content = `
        <div class="share-options">
          <button class="share-option messenger">
            <span class="share-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="#0084FF">
                <path d="M256.55 8C116.52 8 8 110.34 8 248.57c0 72.3 29.71 134.78 78.07 177.94 8.35 7.51 6.63 11.86 8.05 58.23a19.92 19.92 0 0 0 32 16.22c40.08-21.13 34.64-17.7 100.68-48.42 137.61 35.62 294.71-32.28 294.71-203.97C521.5 110.34 396.59 8 256.55 8zm149.24 185.13-73 115.57a37.37 37.37 0 0 1-53.91 9.93l-58.08-43.47a15 15 0 0 0-18 0l-78.37 59.44c-10.46 7.93-24.16-4.6-17.11-15.67l73-115.57a37.36 37.36 0 0 1 53.91-9.93l58.06 43.46a15 15 0 0 0 18 0l78.41-59.38c10.44-7.98 24.14 4.54 17.09 15.62z"/>
              </svg>
            </span>
            <span>Messenger</span>
          </button>
          
          <button class="share-option instagram">
            <span class="share-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="#C13584">
                <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
              </svg>
            </span>
            <span>Instagram</span>
          </button>
          
          <button class="share-option whatsapp">
            <span class="share-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="#25D366">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
            </span>
            <span>WhatsApp</span>
          </button>
          
          <button class="share-option twitter">
            <span class="share-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="#1DA1F2">
                <path d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"/>
              </svg>
            </span>
            <span>X / Twitter</span>
          </button>
          
          <button class="share-option copy">
            <span class="share-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="#6c757d">
                <path d="M433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48v-48h80c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM266 464H54a6 6 0 0 1-6-6V150a6 6 0 0 1 6-6h74v224c0 26.51 21.49 48 48 48h96v42a6 6 0 0 1-6 6zm128-96H182a6 6 0 0 1-6-6V54a6 6 0 0 1 6-6h106v88c0 13.255 10.745 24 24 24h88v202a6 6 0 0 1-6 6zm6-256h-64V48h9.632c1.591 0 3.117.632 4.243 1.757l48.368 48.368a6 6 0 0 1 1.757 4.243V112z"/>
              </svg>
            </span>
            <span>Copiază link</span>
          </button>
        </div>
      `;
      dropdown.innerHTML = content;
      
      // Adăugăm în body
      document.body.appendChild(dropdown);
      dropdownRef.current = dropdown;
      
      // Adăugăm event listeners pentru opțiuni
      const msgrButton = dropdown.querySelector('.messenger');
      const igButton = dropdown.querySelector('.instagram');
      const waButton = dropdown.querySelector('.whatsapp');
      const twButton = dropdown.querySelector('.twitter');
      const cpButton = dropdown.querySelector('.copy');
      
      msgrButton.addEventListener('click', () => {
        // Detectăm tipul de dispozitiv
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        try {
          if (isMobile) {
            // Deschide direct aplicația Messenger pe mobil
            // Folosim window.open pentru a încerca să păstrăm contextul
            window.open(`fb-messenger://share?link=${encodeURIComponent(url)}`, '_self');
          } else {
            // Pentru desktop, folosim dialog/send direct
            window.open(`https://www.facebook.com/dialog/send?app_id=1219609932336050&link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
          }
        } catch (e) {
          // Fallback general în caz de eroare
          window.open(`https://www.messenger.com/`, '_blank');
        }
        
        closeDropdown();
      });
      
      igButton.addEventListener('click', () => {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        try {
          if (isMobile) {
            // Încercăm să deschidem direct aplicația Instagram
            window.open(`instagram://share?text=${encodeURIComponent(title || '')}&url=${encodeURIComponent(url)}`, '_self');
            
            // După o mică pauză, verificăm dacă s-a deschis aplicația, dacă nu, folosim browser
            setTimeout(() => {
              window.open(`https://instagram.com/direct/inbox`, '_blank');
            }, 500);
          } else {
            // Pentru desktop, deschidem pagina de mesaje Instagram în browser
            window.open(`https://instagram.com/direct/inbox`, '_blank');
          }
        } catch (e) {
          // Fallback general în caz de eroare
          window.open(`https://instagram.com/`, '_blank');
        }
        
        closeDropdown();
      });
      
      waButton.addEventListener('click', () => {
        let shareText = '';
        if (title) shareText += title;
        if (message) shareText += shareText ? ` - ${message}` : message;
        shareText += shareText ? '\n\n' + url : url;
        
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
        closeDropdown();
      });
      
      twButton.addEventListener('click', () => {
        const tweetText = title ? `${title}\n\n${url}` : url;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank', 'width=600,height=400');
        closeDropdown();
      });
      
      cpButton.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url)
            .then(() => {
              notify('Link copiat în clipboard!', 'success');
            })
            .catch(() => {
              // Fallback
              const textArea = document.createElement('textarea');
              textArea.value = url;
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              notify('Link copiat în clipboard!', 'success');
            });
        } else {
          // Fallback vechi
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          notify('Link copiat în clipboard!', 'success');
        }
        closeDropdown();
      });
      
      // Adăugăm handler pentru click în afara dropdownului
      const handleClickOutside = (e) => {
        if (dropdown && !dropdown.contains(e.target) && !button.contains(e.target)) {
          closeDropdown();
        }
      };
      
      // Închidem dropdown la ESC
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          closeDropdown();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
      
      // Styling pentru opțiuni
      const options = dropdown.querySelectorAll('.share-option');
      options.forEach(option => {
        option.style.display = 'flex';
        option.style.alignItems = 'center';
        option.style.padding = '10px 12px';
        option.style.margin = '4px 0';
        option.style.border = 'none';
        option.style.background = 'none';
        option.style.width = '100%';
        option.style.textAlign = 'left';
        option.style.cursor = 'pointer';
        option.style.borderRadius = '6px';
        option.style.transition = 'background-color 0.2s ease';
        option.style.color = '#333';
        option.style.fontSize = '14px';
        
        // Hover effect
        option.addEventListener('mouseover', () => {
          option.style.backgroundColor = '#f5f5f5';
        });
        
        option.addEventListener('mouseout', () => {
          option.style.backgroundColor = 'transparent';
        });
      });
      
      // Stiluri pentru icoane
      const icons = dropdown.querySelectorAll('.share-icon');
      icons.forEach(icon => {
        icon.style.marginRight = '12px';
        icon.style.width = '20px';
        icon.style.textAlign = 'center';
      });
      
      // Clean-up function
      return () => {
        if (dropdown && dropdown.parentNode) {
          document.body.removeChild(dropdown);
        }
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, url, title, message]);

  // Funcție pentru a închide dropdown-ul
  const closeDropdown = () => {
    setIsOpen(false);
    if (dropdownRef.current && dropdownRef.current.parentNode) {
      document.body.removeChild(dropdownRef.current);
      dropdownRef.current = null;
    }
  };

  // Toggle dropdown
  const toggleDropdown = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Toggle dropdown clicked, current state:', isOpen);
    setIsOpen(prevState => !prevState);
  };

  // Actualizăm clasa butonului când dropdown-ul este deschis
  const buttonClass = `share-button ${isOpen ? 'active' : ''}`;

  return (
    <div className="share-dropdown-container">
      <button 
        ref={buttonRef}
        className={buttonClass}
        onClick={toggleDropdown}
        title="Partajează acest meme"
      >
        <FaShare className="icon" />
        <span>Share</span>
      </button>
    </div>
  );
};

export default ShareDropdown; 