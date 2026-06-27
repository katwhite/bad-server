import { Router } from 'express'
import {
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer,
} from '../controllers/customers'
import auth, { isAdmin } from '../middlewares/auth'

const customerRouter = Router()

customerRouter.get('/', auth, isAdmin, getCustomers)
customerRouter.get('/:id', auth, isAdmin, getCustomerById)
customerRouter.patch('/:id', auth, isAdmin, updateCustomer)
customerRouter.delete('/:id', auth, isAdmin, deleteCustomer)

export default customerRouter
