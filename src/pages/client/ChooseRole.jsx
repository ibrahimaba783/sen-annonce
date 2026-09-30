import { Link } from 'react-router-dom';

const ChooseRole = () => {
  return (
    <div className="auth-wrapper">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">📦</div>
        <h1>Rejoindre Annonces.sn</h1>
        <p className="subtitle">Choisissez votre type de compte</p>

        <div className="role-cards">
          <Link to="/inscription" className="role-card">
            <div className="role-icon">🛍️</div>
            <h3>Je suis client</h3>
            <p>Je veux parcourir et acheter des annonces</p>
          </Link>

          <Link to="/inscription-prestataire" className="role-card">
            <div className="role-icon">🏪</div>
            <h3>Je suis vendeur</h3>
            <p>Je veux publier et gérer mes annonces</p>
          </Link>
        </div>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default ChooseRole;