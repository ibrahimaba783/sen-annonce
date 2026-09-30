import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { categoryIcon } from '../../api/categoryIcon';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h2>Toutes les catégories</h2>
      <p className="subtitle">Explorez les annonces par domaine</p>

      {loading ? (
        <p>Chargement des catégories...</p>
      ) : (
        <div className="categories-grid" style={{ marginTop: 20 }}>
          {categories.map((cat) => (
            <Link to={`/recherche?categorie=${cat._id}`} key={cat._id} className="category-item">
              <div className="category-icon">{categoryIcon(cat.nom)}</div>
              <span>{cat.nom}</span>
            </Link>
          ))}
          {categories.length === 0 && <p className="empty-state">Aucune catégorie disponible</p>}
        </div>
      )}
    </div>
  );
};

export default Categories;
