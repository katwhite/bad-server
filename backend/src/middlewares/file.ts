import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { mkdirSync } from 'fs'
import path, { extname, join } from 'path'
import { randomBytes } from 'crypto'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const storage = multer.diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        const baseUploadDir = path.join(__dirname, '../public');
        const userDir = process.env.UPLOAD_PATH_TEMP || '';
        const destinationPath = path.resolve(baseUploadDir, userDir);
        if (!destinationPath.startsWith(baseUploadDir)) {
            throw new Error('Недопустимый путь для загрузки');
        }

        mkdirSync(destinationPath, { recursive: true })

        cb(null, destinationPath)
    },

    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        const uniqueName = randomBytes(16).toString('hex') + extname(file.originalname);
    cb(null, uniqueName);
    },
})

const types = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
]

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!types.includes(file.mimetype)) {
        return cb(null, false)
    }

    return cb(null, true)
}

export default multer({ storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024,
        fields: 10,
        parts: 20,
    }, })
