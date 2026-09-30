import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const box = { background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.08)' };
const input = { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 };

const Commander = () => {
  const { user, fetchCartCount } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    adresseLivraison: '',
    villeLivraison: '',
    telephone: user?.telephone || '',
    noteVendeur: '',
  });

  useEffect(() => {
    api
      .get('/cart')
      .then((res) => setArticles((res.data?.articles || []).filter((a) => a.annonce)))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger le panier'))
      .finally(() => setLoading(false));
  }, []);

  const total = articles.reduce((sum, a) => sum + a.annonce.prix * a.quantite, 0);
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.adresseLivraison.trim() || !form.villeLivraison.trim() || !form.telephone.trim()) {
      setError('Adresse, ville et téléphone sont obligatoires.');
      return;
    }
    setSending(true);
    try {
      await api.post('/orders', {
        articles: articles.map((a) => ({ annonceId: a.annonce._id, quantite: a.quantite })),
        ...form,
        modePaiement: 'Paiement à la livraison',
      });
      await fetchCartCount();
      navigate('/mes-commandes');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Chargement...</div>;

  if (articles.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 16, textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Votre panier est vide, il n'y a rien à commander.</p>
        <Link to="/" style={{ color: '#2563eb', fontWeight: 600 }}>Voir les annonces</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 120px' }}>
      <h1 style={{ margin: '0 0 16px', color: '#0f172a' }}>Valider ma commande</h1>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 10, marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ ...box, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 10px' }}>Récapitulatif</h3>
        {articles.map(({ annonce, quantite }) => (
          <div key={annonce._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', gap: 10 }}>
            <span>{annonce.titre} <span style={{ color: '#64748b' }}>× {quantite}</span></span>
            <strong>{fcfa(annonce.prix * quantite)}</strong>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 18, fontWeight: 800 }}>
          <span>Total</span>
          <span style={{ color: '#2563eb' }}>{fcfa(total)}</span>
        </div>
      </div>

      <form onSubmit={submit} style={{ ...box, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Livraison</h3>
        <div>
          <label style={label}>Adresse de livraison *</label>
          <input style={input} name="adresseLivraison" value={form.adresseLivraison} onChange={onChange} placeholder="Ex : Quartier Randoulène, rue 12" />
        </div>
        <div>
          <label style={label}>Ville *</label>
          <input style={input} name="villeLivraison" value={form.villeLivraison} onChange={onChange} placeholder="Ex : Thiès" />
        </div>
        <div>
          <label style={label}>Téléphone *</label>
          <input style={input} name="telephone" value={form.telephone} onChange={onChange} placeholder="77 000 00 00" />
        </div>
        <div>
          <label style={label}>Note pour le vendeur (facultatif)</label>
          <textarea style={{ ...input, minHeight: 70 }} name="noteVendeur" value={form.noteVendeur} onChange={onChange} placeholder="Précisions sur la livraison..." />
        </div>
        <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: 10, borderRadius: 10, fontSize: 14 }}>
          💵 Mode de paiement : <strong>Paiement à la livraison</strong>
        </div>
        <button
          type="submit"
          disabled={sending}
          style={{ background: '#2563eb', color: 'white', border: 'none', padding: 13, borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
        >
          {sending ? 'Envoi en cours...' : 'Confirmer la commande'}
        </button>
      </form>
    </div>
  );
};

export default Commander;