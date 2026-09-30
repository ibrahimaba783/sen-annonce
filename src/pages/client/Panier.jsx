import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const card = { background: 'white', borderRadius: 14, padding: 14, display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 4px rgba(15,23,42,0.08)', flexWrap: 'wrap' };
const qtyBtn = { width: 30, height: 30, borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', fontSize: 16, cursor: 'pointer' };

const Panier = () => {
  const { fetchCartCount } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apply = (data) => setArticles((data?.articles || []).filter((a) => a.annonce));

  useEffect(() => {
    api
      .get('/cart')
      .then((res) => apply(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger le panier'))
      .finally(() => setLoading(false));
  }, []);

  const changeQty = async (annonceId, quantite) => {
    try {
      const { data } = await api.put('/cart/update', { annonceId, quantite });
      apply(data);
      fetchCartCount();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const remove = async (annonceId) => {
    try {
      const { data } = await api.delete(`/cart/remove/${annonceId}`);
      apply(data);
      fetchCartCount();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const total = articles.reduce((sum, a) => sum + a.annonce.prix * a.quantite, 0);

  if (loading) return <div style={{ padding: 24 }}>Chargement du panier...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 120px' }}>
      <h1 style={{ margin: '0 0 16px', color: '#0f172a' }}>🛒 Mon panier</h1>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, marginBottom: 12 }}>{error}</div>
      )}

      {articles.length === 0 ? (
        <div style={{ ...card, flexDirection: 'column', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🛒</div>
          <p style={{ color: '#64748b', margin: 0 }}>Votre panier est vide.</p>
          <Link to="/" style={{ background: '#2563eb', color: 'white', padding: '10px 22px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>
            Voir les annonces
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {articles.map(({ annonce, quantite }) => (
              <div key={annonce._id} style={card}>
                <Link to={`/annonce/${annonce._id}`}>
                  <img
                    src={imageUrl(annonce.images?.[0])}
                    alt={annonce.titre}
                    style={{ width: 84, height: 84, borderRadius: 10, objectFit: 'cover', background: '#e2e8f0' }}
                  />
                </Link>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{annonce.titre}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    {annonce.categorie?.nom || ''} {annonce.ville ? `· ${annonce.ville}` : ''}
                  </div>
                  <div style={{ color: '#2563eb', fontWeight: 700, marginTop: 4 }}>{fcfa(annonce.prix)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={qtyBtn} onClick={() => changeQty(annonce._id, quantite - 1)}>−</button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{quantite}</span>
                  <button style={qtyBtn} onClick={() => changeQty(annonce._id, quantite + 1)}>+</button>
                </div>
                <div style={{ textAlign: 'right', minWidth: 110 }}>
                  <div style={{ fontWeight: 700 }}>{fcfa(annonce.prix * quantite)}</div>
                  <button
                    onClick={() => remove(annonce._id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, marginTop: 4 }}
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginTop: 16, justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: 13 }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{fcfa(total)}</div>
            </div>
            <button
              onClick={() => navigate('/commander')}
              style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 26px', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              Passer la commande
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Panier;