const { Router } = require('express');
const multer = require('multer');
const { processImport } = require('../services/importService');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const { total, matched, unresolved, skipped } = processImport(req.file.buffer);
    res.json({
      success: true,
      message: `Processed ${total} rows: ${matched} matched, ${unresolved} flagged for review, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped.`,
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
