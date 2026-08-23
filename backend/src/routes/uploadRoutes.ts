import { Router, type Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { protect, requireRole, type AuthRequest } from '../middlewares/authMiddleware';
import { upload, handleUploadError } from '../middlewares/upload';
import { requireEnv } from '../config/env';
import { recordAuditLog } from '../utils/audit';
import { logger } from '../utils/logger';

const router = Router();

function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
  });
}

router.post(
  '/admin/uploads',
  protect,
  requireRole('admin'),
  upload.single('file'),
  handleUploadError,
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Envie um arquivo de imagem.' } });
      return;
    }

    try {
      configureCloudinary();
      const base64 = req.file.buffer.toString('base64');
      const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${base64}`, {
        folder: 'boilerplate',
      });
      await recordAuditLog(req, {
        action: 'upload',
        resource: 'image',
        resourceId: result.public_id,
        metadata: { bytes: req.file.size, mimetype: req.file.mimetype },
      });
      res.status(201).json({ data: { url: result.secure_url, publicId: result.public_id } });
    } catch (error) {
      logger.error('falha no upload para o Cloudinary', { err: error });
      await recordAuditLog(req, {
        action: 'upload',
        resource: 'image',
        status: 'failure',
        metadata: { bytes: req.file.size, mimetype: req.file.mimetype },
      });
      res.status(502).json({ error: { code: 'UPLOAD_FAILED', message: 'Nao foi possivel enviar a imagem.' } });
    }
  },
);

export default router;
