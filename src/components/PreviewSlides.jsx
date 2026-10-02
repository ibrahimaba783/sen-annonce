import { useEffect, useState } from 'react';

// Aperçu de la carte avec diaporama sur les photos
const PreviewSlides = ({ urls = [] }) => {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (urls.length < 2) {
      setI(0);
      return undefined;
    }
    let reduit = false;
    try {
      reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      reduit = false;
    }
    if (reduit) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % urls.length), 2600);
    return () => clearInterval(t);
  }, [urls.length]);

  const actif = urls.length ? i % urls.length : 0;

  if (urls.length === 0) {
    return (
      <div className="pa-pv-empty">
        <span>📷</span>
        Vos photos apparaîtront ici
      </div>
    );
  }

  return (
    <>
      {urls.map((u, idx) => (
        <img key={`${u}-${idx}`} className={`pa-slide ${idx === actif ? 'on' : ''}`} src={u} alt="" />
      ))}
      {urls.length > 1 && (
        <div className="pa-pv-dots">
          {urls.map((u, idx) => (
            <i key={`${u}-${idx}`} className={idx === actif ? 'on' : ''} />
          ))}
        </div>
      )}
    </>
  );
};

export default PreviewSlides;