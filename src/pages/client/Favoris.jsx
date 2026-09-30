import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';

const Favoris = () => {
  const [favoris, setFavoris] = useState([]);

  useEffect(() => {
    api.get('/annonces/utilisateur/favoris').then((res) => setFavoris(res.data));
  }, []);

  return (
    <div className="page">
      <h2>Mes favoris</h2>
      <div className="annonces-list" style={{ marginTop: 16 }}>
        {favoris.map((a) => (
          <Link to={`/annonce/${a._id}`} key={a._id} className="annonce-row">
            <img src={imageUrl(a.images?.[0])} alt={a.titre} />
            <div>
              <p className="annonce-titre">{a.titre}</p>
              <p className="annonce-prix">{a.prix.toLocaleString()} FCFA</p>
              <p className="annonce-ville">{a.ville}</p>
            </div>
          </Link>
        ))}
        {favoris.length === 0 && <p className="empty-state">Aucun favori pour le moment</p>}
      </div>
    </div>
  );
};

export default Favoris;