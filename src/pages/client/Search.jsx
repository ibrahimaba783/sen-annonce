import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { categoryIcon } from '../../api/categoryIcon';
import { useAuth } from '../../context/AuthContext';

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [favorisIds, setFavorisIds] = useState([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedCityTab, setSelectedCityTab] = useState('Toutes');

  const [filtres, setFiltres] = useState({
    q: searchParams.get('q') || '',
    categorie: searchParams.get('categorie') || '',
    ville: '',
    prixMin: '',
    prixMax: '',
    tri: 'recents',
  });

  const villesList = ['Toutes', 'Dakar', 'Pikine', 'Rufisque', 'Thiès', 'Saint-Louis'];

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));

    if (user) {
      api.get('/annonces/utilisateur/favoris').then((res) => {
        if (Array.isArray(res.data)) {
          setFavorisIds(res.data.map((item) => item._id));
        }
      }).catch(() => {});
    }
  }, [user]);

  const rechercher = async (customCity = selectedCityTab) => {
    const params = { ...filtres };
    if (customCity && customCity !== 'Toutes') {
      params.ville = customCity;
    }
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const { data } = await api.get('/annonces', { params: cleanParams });
    setAnnonces(data);
  };

  useEffect(() => {
    rechercher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityTab]);

  const handleResetFilters = () => {
    setFiltres({
      q: '',
      categorie: '',
      ville: '',
      prixMin: '',
      prixMax: '',
      tri: 'recents',
    });
    setSelectedCityTab('Toutes');
    rechercher('Toutes');
  };

  const toggleFavori = async (e, annonceId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/connexion');

    try {
      const { data } = await api.post(`/annonces/${annonceId}/favori`);
      if (data.estFavori) {
        setFavorisIds((prev) => [...prev, annonceId]);
      } else {
        setFavorisIds((prev) => prev.filter((id) => id !== annonceId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      {/* Top Header bar with search & filter toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#1f2937' }}
          >
            ←
          </button>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '0 12px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="Rechercher une annonce..."
              value={filtres.q}
              onChange={(e) => setFiltres({ ...filtres, q: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && rechercher()}
              style={{ width: '100%', border: 'none', outline: 'none', padding: '10px 0', fontSize: 14 }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowFiltersPanel((v) => !v)}
          style={{
            marginLeft: 10,
            background: showFiltersPanel ? 'var(--primary)' : 'white',
            color: showFiltersPanel ? 'white' : 'var(--primary)',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" x2="20" y1="21" y2="21" />
            <line x1="4" x2="20" y1="14" y2="14" />
            <line x1="4" x2="20" y1="7" y2="7" />
            <circle cx="14" cy="7" r="2" />
            <circle cx="8" cy="14" r="2" />
            <circle cx="16" cy="21" r="2" />
          </svg>
          Filtres
        </button>
      </div>

      {/* Screen 6: Filters Drawer Panel */}
      {showFiltersPanel && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Filtres de recherche</h3>
            <button
              onClick={handleResetFilters}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Réinitialiser
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Catégorie</label>
              <select
                value={filtres.categorie}
                onChange={(e) => setFiltres({ ...filtres, categorie: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white' }}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {categoryIcon(c.nom)} {c.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Prix (FCFA)</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  placeholder="Min"
                  type="number"
                  value={filtres.prixMin}
                  onChange={(e) => setFiltres({ ...filtres, prixMin: e.target.value })}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
                />
                <input
                  placeholder="Max"
                  type="number"
                  value={filtres.prixMax}
                  onChange={(e) => setFiltres({ ...filtres, prixMax: e.target.value })}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Localisation</label>
              <input
                placeholder="Ex: Dakar, Pikine..."
                value={filtres.ville}
                onChange={(e) => setFiltres({ ...filtres, ville: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Trier par</label>
              <select
                value={filtres.tri}
                onChange={(e) => setFiltres({ ...filtres, tri: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white' }}
              >
                <option value="recents">Plus récent</option>
                <option value="popularite">Popularité</option>
                <option value="prix_asc">Prix croissant</option>
                <option value="prix_desc">Prix décroissant</option>
              </select>
            </div>

            <button
              className="btn-primary"
              onClick={() => {
                setShowFiltersPanel(false);
                rechercher();
              }}
              style={{ marginTop: 8 }}
            >
              Voir les résultats
            </button>
          </div>
        </div>
      )}

      {/* Screen 7: City Tabs Bar */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
        {villesList.map((city) => (
          <button
            key={city}
            onClick={() => setSelectedCityTab(city)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              background: selectedCityTab === city ? 'var(--primary)' : 'white',
              color: selectedCityTab === city ? 'white' : '#4b5563',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Cards List Layout (Screen 7) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {annonces.map((a) => {
          const isFav = favorisIds.includes(a._id);
          return (
            <Link
              to={`/annonce/${a._id}`}
              key={a._id}
              style={{
                display: 'flex',
                gap: 14,
                background: 'white',
                padding: 12,
                borderRadius: 14,
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                position: 'relative'
              }}
            >
              <img
                src={imageUrl(a.images?.[0])}
                alt={a.titre}
                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10 }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 6px 0', color: '#111827' }}>{a.titre}</p>
                <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 15, margin: '0 0 6px 0' }}>
                  {a.prix?.toLocaleString()} FCFA
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>📍 {a.ville}</p>
              </div>

              <button
                onClick={(e) => toggleFavori(e, a._id)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  cursor: 'pointer'
                }}
              >
                {isFav ? '❤️' : '♡'}
              </button>
            </Link>
          );
        })}
        {annonces.length === 0 && <p className="empty-state">Aucune annonce ne correspond à votre recherche.</p>}
      </div>
    </div>
  );
};

export default Search;