// Load OpenDyslexic font
const loadOpenDyslexicFont = () => {
  if (typeof document === 'undefined') return;
  
  const loadFont = async () => {
    try {
      const fontUrl = '/fonts/OpenDyslexic-Bold.otf';
      const fontFace = new FontFace('OpenDyslexic', `url(${fontUrl})`);
      
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