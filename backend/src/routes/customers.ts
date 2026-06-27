import { Router } from 'express'
import {
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer,
} from '../controllers/customers'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import { Role } from '../models/user'

const customerRouter = Router()

// customerRouter.get('/', auth, getCustomers)
// customerRouter.get('/:id', auth, getCustomerById)
// customerRouter.patch('/:id', auth, updateCustomer)
// customerRouter.delete('/:id', auth, deleteCustomer)

customerRouter.get(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    getCustomers
)
customerRouter.get(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    getCustomerById
)

customerRouter.patch(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    updateCustomer
)

customerRouter.delete(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    deleteCustomer
)

export default customerRouter
