import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const DEMO = [
  { label: 'Jan', v: 12 },
  { label: 'Fév', v: 20 },
  { label: 'Mar', v: 31 },
  { label: 'Avr', v: 36 },
  { label: 'Mai', v: 48 },
  { label: 'Juin', v: 57 },
];

/* Compteur animé de 0 jusqu'à la valeur */
const useCompteur = (cible, duree = 1300) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    const fin = Number(cible) || 0;
    let reduit = false;
    try {
      reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      reduit = false;
    }
    if (fin === 0 || reduit) {
      setV(fin);
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / duree, 1);
      setV(Math.round(fin * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree]);
  return v;
};

/* Normalise la réponse de /admin/chart-stats (tableau de nombres ou d'objets) */
const lirePoint = (d, i) =>
  typeof d === 'number'
    ? { label: MOIS[i] || String(i + 1), v: d }
    : {
        label: String(d.label ?? d.mois ?? d.month ?? d.name ?? d._id ?? MOIS[i] ?? i + 1),
        v: Number(d.total ?? d.count ?? d.value ?? d.valeur ?? d.nombre ?? d.annonces ?? d.users ?? 0),
      };

/* Courbe lissée passant par tous les points */
const courbe = (pts) =>
  pts.reduce((d, p, i, a) => {
    if (i === 0) return `M ${p[0]} ${p[1]}`;
    const p0 = a[i - 2] || a[i - 1];
    const p1 = a[i - 1];
    const p3 = a[i + 1] || p;
    const c1x = p1[0] + (p[0] - p0[0]) / 6;
    const c1y = p1[1] + (p[1] - p0[1]) / 6;
    const c2x = p[0] - (p3[0] - p1[0]) / 6;
    const c2y = p[1] - (p3[1] - p1[1]) / 6;
    return `${d} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p[0]} ${p[1]}`;
  }, '');

const Kpi = ({ to, label, valeur, icone, couleur, delai }) => {
  const v = useCompteur(valeur);
  return (
    <Link to={to} className={`dash-kpi ${couleur}`} style={{ '--d': `${delai}ms` }}>
      <span className="dash-kpi-ico">{icone}</span>
      <span className="dash-kpi-label">{label}</span>
      <span className="dash-kpi-val">{v.toLocaleString('fr-FR')}</span>
      <span className="dash-kpi-more">
        Voir le détail <i>→</i>
      </span>
      <span className="dash-kpi-mark" aria-hidden="true">
        {icone}
      </span>
    </Link>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [periode, setPeriode] = useState('Mensuel');
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    setErreur(false);
    api
      .get('/admin/stats')
      .then((res) => setStats(res.data || {}))
      .catch(() => setErreur(true));
    api
      .get('/admin/chart-stats')
      .then((res) => {
        const brut = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.points || [];
        setChartData(Array.isArray(brut) ? brut : []);
      })
      .catch(() => setChartData([]));
  }, [essai]);

  /* ----- Points du graphique ----- */
  const { points, exemple } = useMemo(() => {
    const reels = Array.isArray(chartData) && chartData.length >= 2 ? chartData.map(lirePoint) : null;
    const liste = reels || DEMO;
    const max = Math.max(...liste.map((p) => p.v));
    const min = Math.min(...liste.map((p) => p.v));
    const n = liste.length;
    const pts = liste.map((p, i) => ({
      ...p,
      x: 10 + (i / (n - 1)) * 480,
      y: max === min ? 75 : 128 - ((p.v - min) / (max - min)) * 108,
    }));
    return { points: pts, exemple: !reels };
  }, [chartData]);

  if (erreur && !stats) {
    return (
      <div className="dash">
        <div className="dash-error">
          <span>📡</span>
          <strong>Impossible de charger le tableau de bord</strong>
          <p>Vérifiez que le serveur est lancé puis réessayez.</p>
          <button type="button" onClick={() => setEssai((n) => n + 1)}>
            ↻ Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dash">
        <div className="dash-skel" style={{ height: 120 }} />
        <div className="dash-kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dash-skel" style={{ height: 150 }} />
          ))}
        </div>
        <div className="dash-skel" style={{ height: 330 }} />
      </div>
    );
  }

  const nbUsers = stats.totalUsers ?? 0;
  const nbAnnonces = stats.totalAnnonces ?? 0;
  const nbAttente = stats.enAttente ?? 0;
  const nbSignal = stats.signalements ?? 0;

  const tracé = points.map((p) => [p.x, p.y]);
  const ligne = courbe(tracé);
  const aire = `${ligne} L ${tracé[tracé.length - 1][0]} 150 L ${tracé[0][0]} 150 Z`;

  return (
    <div className="dash">
      {/* Bandeau de bienvenue */}
      <section className="dash-hero">
        <div className="dash-hero-txt">
          <h2>Bonjour {user?.prenom || 'Admin'} 👋</h2>
          <p>
            {nbAttente > 0
              ? `${nbAttente} annonce${nbAttente > 1 ? 's' : ''} en attente de modération`
              : 'Tout est à jour : aucune annonce en attente.'}
            {nbSignal > 0 && ` · ${nbSignal} signalement${nbSignal > 1 ? 's' : ''} à traiter`}
          </p>
          {(nbAttente > 0 || nbSignal > 0) && (
            <Link to={nbAttente > 0 ? '/admin/annonces' : '/admin/signalements'} className="dash-hero-cta">
              {nbAttente > 0 ? 'Modérer les annonces' : 'Voir les signalements'} <span>→</span>
            </Link>
          )}
        </div>
        <div className="dash-hero-ico" aria-hidden="true">
          🛡️
        </div>
      </section>

      {/* Chiffres clés */}
      <div className="dash-kpis">
        <Kpi to="/admin/utilisateurs" label="Utilisateurs" valeur={nbUsers} icone="👥" couleur="blue" delai={0} />
        <Kpi to="/admin/annonces" label="Annonces" valeur={nbAnnonces} icone="📋" couleur="green" delai={90} />
        <Kpi to="/admin/annonces" label="En attente" valeur={nbAttente} icone="⏳" couleur="amber" delai={180} />
        <Kpi to="/admin/signalements" label="Signalements" valeur={nbSignal} icone="🚨" couleur="red" delai={270} />
      </div>

      {/* Graphique */}
      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h3>Statistiques</h3>
            <p>{exemple ? 'Données d’exemple (aucune statistique reçue)' : 'Évolution de l’activité'}</p>
          </div>
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} aria-label="Période">
            <option value="Mensuel">Mensuel</option>
            <option value="Annuel">Annuel</option>
          </select>
        </div>

        <div className="dash-chart" key={periode}>
          <div className="dash-plot">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="dash-svg">
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[30, 75, 120].map((y) => (
                <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#e8edf5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              <g className="dash-reveal">
                <path d={aire} fill="url(#dashGrad)" />
                <path d={ligne} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>

            {points.map((p, i) => (
              <span
                key={`${p.label}-${i}`}
                className="dash-dot"
                style={{
                  left: `${(p.x / 500) * 100}%`,
                  top: `${(p.y / 150) * 100}%`,
                  '--t': `${0.2 + (i / Math.max(points.length - 1, 1)) * 1.3}s`,
                }}
              >
                <em>
                  <b>{p.v.toLocaleString('fr-FR')}</b> {p.label}
                </em>
              </span>
            ))}
          </div>

          <div className="dash-labels">
            {points.map((p, i) => (
              <span key={`${p.label}-${i}`} style={{ left: `${(p.x / 500) * 100}%` }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;