import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS, ORIGIN_ALLOW } from './config'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()

app.use(cookieParser())

app.use(cors({ origin: ORIGIN_ALLOW, credentials: true }))
app.options('*', cors())

// app.use(express.static(path.join(__dirname, 'public')));

// const csrf = require('csurf');
// const csrfProtection = csrf({ cookie: true });

// app.use((req, res, next) => {
//   if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/csrf-token') {
//     return next();
//   }
//   csrfProtection(req, res, next);
// });

app.use(serveStatic(path.join(__dirname, 'public')))
app.use(urlencoded({ extended: true }))
app.use(json({ limit: '1mb' }))

// declare global {
//     namespace Express {
//         interface Request {
//             csrfToken(): string;
//         }
//     }
// }

// app.get('/auth/csrf-token', csrfProtection, (req, res) => {
//     res.json({ csrfToken: req.csrfToken() });
// });

app.use(routes);

app.use(errors())
app.use(errorHandler)
app.disable('x-powered-by')

// eslint-disable-next-line no-console

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
