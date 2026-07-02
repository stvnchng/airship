const { Router } = require('express');
const db = require('../db');

const router = Router();

const resolveRow = db.prepare(
  'UPDATE historical_shipments SET tenant_id = ?, review_reason = NULL WHERE id = ?'
);

const dismissRow = db.prepare(
  'UPDATE historical_shipments SET review_reason = NULL WHERE id = ?'
);

// Clear review_reason when size is saved and reason was no_filter_size.
const updateSize = db.prepare(`
  UPDATE historical_shipments
  SET custom_field_1 = ?,
      review_reason  = CASE WHEN review_reason = 'no_filter_size' THEN NULL ELSE review_reason END
  WHERE id = ?
`);

// Link an unmatched or ambiguous row to a specific tenant.
router.patch('/:id/resolve', (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const result = resolveRow.run(tenantId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Row not found' });
  res.json({ success: true });
});

// Save a filter size; if that was the only reason for review, clears the row from the queue.
router.patch('/:id/size', (req, res) => {
  const { size } = req.body;
  if (!size || !size.trim()) return res.status(400).json({ error: 'size required' });
  const result = updateSize.run(size.trim(), req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Row not found' });
  // Return whether the row is still in the queue so the client can decide
  const row = db.prepare('SELECT review_reason FROM historical_shipments WHERE id = ?').get(req.params.id);
  res.json({ success: true, stillInQueue: row?.review_reason !== null });
});

// Dismiss — clears review_reason without linking. Row stays in historical_shipments.
router.delete('/:id', (req, res) => {
  const result = dismissRow.run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Row not found' });
  res.json({ success: true });
});

module.exports = router;
