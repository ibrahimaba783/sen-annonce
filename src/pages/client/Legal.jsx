import { Link } from 'react-router-dom';

const EMAIL = 'ibah2536@gmail.com';

const wrap = {
  minHeight: '100vh',
  background: '#f4f6fb',
  padding: '32px 16px',
  fontFamily: 'system-ui, sans-serif',
  color: '#0f172a',
};
const card = {
  maxWidth: 760,
  margin: '0 auto',
  background: 'white',
  borderRadius: 14,
  padding: '28px 24px',
  lineHeight: 1.65,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

function Page({ title, children }) {
  return (
    <div style={wrap}>
      <div style={card}>
        <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
          ← Retour à l'accueil
        </Link>
        <h1 style={{ marginTop: 16 }}>{title}</h1>
        {children}
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 28 }}>
          Dernière mise à jour : 1er octobre 2026
        </p>
      </div>
    </div>
  );
}

export function Confidentialite() {
  return (
    <Page title="Politique de confidentialité">
      <p>
        Annonces+ est une plateforme de petites annonces au Sénégal. Cette page explique
        quelles données nous collectons et comment nous les utilisons.
      </p>

      <h2>Données collectées</h2>
      <p>
        Lors de votre inscription ou de votre connexion (par email, Google ou Facebook),
        nous collectons : votre nom, votre adresse email et, si vous utilisez Google ou
        Facebook, votre photo de profil publique. Nous conservons aussi les annonces,
        messages et commandes que vous créez sur la plateforme.
      </p>

      <h2>Utilisation des données</h2>
      <p>
        Ces données servent uniquement à créer et gérer votre compte, vous permettre de
        publier des annonces, de communiquer avec d'autres utilisateurs et de passer ou
        recevoir des commandes. Nous ne vendons pas vos données et ne les partageons pas
        avec des annonceurs.
      </p>

      <h2>Connexion avec Google et Facebook</h2>
      <p>
        Nous recevons de Google ou de Facebook uniquement votre nom, votre email et votre
        photo de profil. Nous n'accédons ni à vos amis, ni à vos publications, ni à
        aucune autre donnée de votre compte.
      </p>

      <h2>Conservation et sécurité</h2>
      <p>
        Vos données sont stockées sur des serveurs sécurisés et conservées tant que votre
        compte existe. Les mots de passe sont chiffrés.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l'accès, la correction ou la suppression de vos données à
        tout moment. Voir la page{' '}
        <Link to="/suppression-donnees">Suppression des données</Link> ou écrivez-nous à{' '}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      </p>
    </Page>
  );
}

export function SuppressionDonnees() {
  return (
    <Page title="Suppression des données">
      <p>
        Vous pouvez demander la suppression de votre compte Annonces+ et de toutes les
        données associées (profil, annonces, messages, commandes).
      </p>

      <h2>Comment faire</h2>
      <ol>
        <li>
          Envoyez un email à <a href={`mailto:${EMAIL}`}>{EMAIL}</a> avec pour objet
          « Suppression de mon compte ».
        </li>
        <li>
          Indiquez l'adresse email utilisée pour votre compte (ou la connexion Google /
          Facebook employée).
        </li>
        <li>
          Votre compte et vos données seront supprimés sous 30 jours maximum, et nous
          vous confirmerons par email.
        </li>
      </ol>

      <h2>Si vous avez utilisé Facebook</h2>
      <p>
        Vous pouvez aussi retirer l'accès d'Annonces+ depuis Facebook : Paramètres &gt;
        Sécurité et connexion &gt; Applications et sites web, puis supprimez « Annonces+ ».
        Écrivez-nous ensuite pour supprimer les données déjà enregistrées chez nous.
      </p>
    </Page>
  );
}