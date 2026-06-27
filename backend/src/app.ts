import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import helmet from 'helmet'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import { basicLimiter } from './middlewares/limiter'

import { DB_ADDRESS, ORIGIN_ALLOW } from './config'

const { PORT = 3000 } = process.env
const app = express()

app.use(cookieParser())

app.use(cors({ origin: ORIGIN_ALLOW, credentials: true }))
app.options('{*path}', cors())

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
app.use(urlencoded({ extended: true, limit: '1mb', parameterLimit: 20 }))
app.use(json({ limit: '1mb' }))
app.use(basicLimiter)
app.use(helmet());
app.disable('x-powered-by')

// eslint-disable-next-line no-console

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        app.use(routes)
        app.use(errors())
        app.use(errorHandler)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
