import rateLimit from 'express-rate-limit'
import { Router } from 'express'
import csrf from 'csurf';
import {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'

const authRouter = Router()

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с IP
    message: 'Too many requests, try again later',
    standardHeaders: true,
    legacyHeaders: false,
})

const csrfProtection = csrf({ cookie: true });

declare global {
    namespace Express {
        interface Request {
            csrfToken(): string;
        }
    }
}

authRouter.get('/csrf-token', csrfProtection, (req, res) => {
    res.send({ csrfToken: req.csrfToken() });
});

authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', limiter, auth, csrfProtection, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)
authRouter.post('/login', limiter, csrfProtection, login)
authRouter.get('/token', refreshAccessToken)
authRouter.get('/logout', logout)
authRouter.post('/register', limiter, csrfProtection, register)

export default authRouter
