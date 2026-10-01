const iconMap = {
  // Catégories existantes
  immobilier: '🏠',
  automobile: '🚗',
  emploi: '💼',
  emplois: '💼',
  téléphones: '📱',
  telephones: '📱',
  informatique: '💻',
  mode: '👗',
  services: '🛠️',
  électronique: '🔌',
  electronique: '🔌',
  maison: '🏡',
  véhicules: '🚗',
  vehicules: '🚗',

  // Nouvelles catégories
  'mode & beauté': '👗',
  'mode & beaute': '👗',
  'téléphones & tablettes': '📱',
  'telephones & tablettes': '📱',
  'meubles & décoration': '🛋️',
  'meubles & decoration': '🛋️',
  électroménager: '🔌',
  electromenager: '🔌',
  'motos & scooters': '🏍️',
  'agriculture & élevage': '🚜',
  'agriculture & elevage': '🚜',
  'formation & cours': '🎓',
  'événements & loisirs': '🎉',
  'evenements & loisirs': '🎉',
  animaux: '🐾',
  'enfants & bébés': '👶',
  'enfants & bebes': '👶',
  'matériaux & chantier': '🏗️',
  'materiaux & chantier': '🏗️',
  'voyages & hébergement': '🏖️',
  'voyages & hebergement': '🏖️',
  'alimentation & restauration': '🍽️',
};

export const categoryIcon = (nom) => {
  const key = nom?.toLowerCase().trim();
  return iconMap[key] || '📦';
};