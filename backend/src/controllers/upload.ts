import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'

import sharp from 'sharp'
import fs from 'fs';
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }
    try {
        const stats = fs.statSync(req.file.path);
        if (stats.size < 2 * 1024) {
            return next(new BadRequestError('Файл слишком маленький (минимум 2KB)'));
        }
        const metadata = await sharp(req.file.path).metadata();
        if (!metadata.width || !metadata.height) {
            return next(new BadRequestError('Файл не является изображением'));
        }
        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file?.filename}`
        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file?.originalname,
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
