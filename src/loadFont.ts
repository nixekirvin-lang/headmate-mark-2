// Load OpenDyslexic font
const loadOpenDyslexicFont = () => {
  if (typeof document === 'undefined') return;
  
  const fontUrl = '/fonts/OpenDyslexic-Bold.otf';
  const fontFace = new FontFace('OpenDyslexic', `url(${fontUrl})`);
  
  fontFace.load().then((loadedFont) => {
    document.fonts.add(loadedFont);
    console.log('OpenDyslexic font loaded successfully');
  }).catch((error) => {
    console.error('Failed to load OpenDyslexic font:', error);
  });
};

// Run on module load
loadOpenDyslexicFont();