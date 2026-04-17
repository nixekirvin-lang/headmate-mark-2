// Load OpenDyslexic font
import openDyslexicFont from './fonts/OpenDyslexic-Bold.otf?url';

const loadOpenDyslexicFont = () => {
  if (typeof document === 'undefined') return;
  
  const loadFont = async () => {
    try {
      const fontFace = new FontFace('OpenDyslexic', `url(${openDyslexicFont})`);
      
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      console.log('OpenDyslexic font loaded successfully');
    } catch (error) {
      console.error('Failed to load OpenDyslexic font:', error);
    }
  };
  
  loadFont();
};

loadOpenDyslexicFont();