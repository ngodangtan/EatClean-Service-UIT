import DISEASE_CATALOG from '../data/diseaseCatalog.js';

/**
 * GET /api/diseases
 * Returns the full list of available diseases with related health indicators.
 */
export const getDiseases = (req, res) => {
  res.json({
    success: true,
    data: DISEASE_CATALOG
  });
};
