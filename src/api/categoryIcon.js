const iconMap = {
  immobilier: '🏠',
  automobile: '🚗',
  emploi: '💼',
  téléphones: '📱',
  telephones: '📱',
  informatique: '💻',
  mode: '👗',
  services: '🛠️',
  électronique: '🔌',
  electronique: '🔌',
};

export const categoryIcon = (nom) => {
  const key = nom?.toLowerCase().trim();
  return iconMap[key] || '📦';
};