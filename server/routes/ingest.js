const { Router } = require('express');
const multer = require('multer');
const db = require('../db');
const { processImport } = require('../services/importService');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const logImport = db.prepare(
  'INSERT INTO import_log (imported_at, row_count, matched, unresolved) VALUES (?, ?, ?, ?)'
);

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const { total, matched, flagged, skipped } = processImport(req.file.buffer);
    logImport.run(new Date().toISOString(), total, matched, flagged);
    res.json({
      success: true,
      message: `Processed ${total} rows: ${matched} matched, ${flagged} flagged for review, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped.`,
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
