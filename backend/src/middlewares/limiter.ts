import { rateLimit } from 'express-rate-limit'

export const basicLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 50,
    message: 'Слишком много запросов, попробуйте снова через 1 минуту.',
    standardHeaders: true,
    legacyHeaders: false,
})

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Слишком много попыток входа, попробуйте снова через 15 минут.',
    standardHeaders: true,
    skipSuccessfulRequests: true,
    legacyHeaders: false,
})

export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Слишком много загрузок файлов, попробуйте снова черезе 15 минут.',
    standardHeaders: true,
    legacyHeaders: false,
})
