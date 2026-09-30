import { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../api/imageUrl';

const ImageSlideshow = ({ images = [], alt = '', interval = 3200, offset = 0 }) => {
  const liste = (images || []).filter(Boolean);
  const n = liste.length;
  const [idx, setIdx] = useState(0);
  const premier = useRef(true);

  useEffect(() => {
    if (n < 2) return undefined;

    let reduit = false;
    try {
      reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      reduit = false;
    }
    if (reduit) return undefined;

    const delai = premier.current ? interval + offset : interval;
    const t = setTimeout(() => {
      premier.current = false;
      setIdx((i) => (i + 1) % n);
    }, delai);

    return () => clearTimeout(t);
  }, [idx, n, interval, offset]);

  if (n === 0) return <div className="hm-noimg">{'\u{1F6CD}\uFE0F'}</div>;

  const actif = idx % n;

  return (
    <>
      {liste.map((img, i) => (
        <img
          key={`${img}-${i}`}
          className={`ss-img ${i === actif ? 'on' : ''}`}
          src={imageUrl(img)}
          alt={i === actif ? alt : ''}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}
      {n > 1 && (
        <div className="ss-dots" aria-hidden="true">
          {liste.map((_, i) => (
            <span key={i} className={`ss-dot ${i === actif ? 'on' : ''}`} />
          ))}
        </div>
      )}
    </>
  );
};

export default ImageSlideshow;
