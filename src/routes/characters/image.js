const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { getDatabase } = require('../../database/connection');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { canModifyCharacter } = require('./shared');
const { getSystemForCampaign } = require('../../systems/registry');

const router = express.Router();
const uploadsDirectory = path.join(__dirname, '../../../public/uploads/characters');
const imageUrlPrefix = '/uploads/characters/';
const extensions = new Map([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif'],
]);

fs.mkdirSync(uploadsDirectory, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadsDirectory,
        filename(req, file, callback) {
            callback(null, `${req.params.id}-${Date.now()}-${crypto.randomUUID()}${extensions.get(file.mimetype)}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, callback) {
        if (!extensions.has(file.mimetype)) {
            const error = new Error('Image must be a JPEG, PNG, WebP, or GIF file');
            error.status = 400;
            return callback(error);
        }
        callback(null, true);
    },
}).single('image');

function parseImage(req, res, next) {
    upload(req, res, error => {
        if (!error) return next();
        error.status = 400;
        if (error.code === 'LIMIT_FILE_SIZE') {
            error.clientMessage = 'Image must be 5 MB or smaller';
        }
        next(error);
    });
}

function uploadedFilePath(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith(imageUrlPrefix)) return null;
    return path.join(uploadsDirectory, path.basename(imageUrl));
}

function removeUploadedFile(imageUrl) {
    const filePath = uploadedFilePath(imageUrl);
    if (!filePath) return;
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

function authorizeCharacter(req, res, next) {
    const character = getDatabase().prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }
    req.character = character;
    next();
}

router.post('/:id/image', authenticate, authorizeCharacter, parseImage, asyncHandler((req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    const db = getDatabase();
    const imageUrl = `${imageUrlPrefix}${req.file.filename}`;
    try {
        db.prepare('UPDATE characters SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(imageUrl, req.params.id);
    } catch (error) {
        removeUploadedFile(imageUrl);
        throw error;
    }

    removeUploadedFile(req.character.image_url);
    const system = getSystemForCampaign(db, req.campaign.id);
    res.json(system.sheet.hydrateSheet(db, db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id), system));
}));

router.delete('/:id/image', authenticate, authorizeCharacter, asyncHandler((req, res) => {
    const db = getDatabase();
    db.prepare('UPDATE characters SET image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(req.params.id);
    removeUploadedFile(req.character.image_url);
    const system = getSystemForCampaign(db, req.campaign.id);
    res.json(system.sheet.hydrateSheet(db, db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id), system));
}));

module.exports = router;
