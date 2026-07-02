const { Router } = require('express');
const { getEligibleTenants, DEFAULT_DATE } = require('../services/eligibilityService');

const router = Router();

router.get('/', (req, res) => {
  try {
    const asOf = req.query.asOf || DEFAULT_DATE;
    const tenants = getEligibleTenants(asOf);
    res.json({ count: tenants.length, tenants, asOf });
  } catch (err) {
    console.error('Eligibility check error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
