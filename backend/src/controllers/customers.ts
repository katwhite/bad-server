import { NextFunction, Request, Response } from 'express'
import mongoose, { FilterQuery } from 'mongoose'

import Order from '../models/order'
import User, { IUser } from '../models/user'
import { sanitize, sanitizeDateRange, sanitizeNumberRange, sanitizeValue } from '../utils/guard'

import escapeRegExp from '../utils/escapeRegExp'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'

// TODO: Добавить guard admin
// eslint-disable-next-line max-len
// Get GET /customers?page=2&limit=5&sort=totalAmount&order=desc&registrationDateFrom=2023-01-01&registrationDateTo=2023-12-31&lastOrderDateFrom=2023-01-01&lastOrderDateTo=2023-12-31&totalAmountFrom=100&totalAmountTo=1000&orderCountFrom=1&orderCountTo=10
export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sanitizedQuery = sanitizeValue(req.query)
        const {
            page = 1,
            limit = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
            search,
        } = sanitizedQuery

        const filters: FilterQuery<Partial<IUser>> = {}

        const registrationDateFilter = sanitizeDateRange(
            registrationDateFrom,
            registrationDateTo,
            new Date('2000-01-01'),
            new Date()
        )

        if (registrationDateFilter) {
            filters.createdAt = registrationDateFilter
        }

        const lastOrderDateFilter = sanitizeDateRange(
            lastOrderDateFrom,
            lastOrderDateTo,
            undefined,
            new Date()
        )

        if (lastOrderDateFilter) {
            filters.lastOrderDate = lastOrderDateFilter
        }

        const totalAmountFilter = sanitizeNumberRange(
            totalAmountFrom,
            totalAmountTo,
            0
        )

        if (totalAmountFilter) {
            filters.totalAmount = totalAmountFilter
        }

        const orderCountFilter = sanitizeNumberRange(
            orderCountFrom,
            orderCountTo,
            0
        )

        if (orderCountFilter) {
            filters.orderCount = orderCountFilter
        }

        if (search) {
            const sanitizedSearch = sanitize(search as string, 'strict')
            const escapedSearch = escapeRegExp(sanitizedSearch)
            const searchRegex = new RegExp(escapedSearch as string, 'i')
            const orders = await Order.find(
                {
                    $or: [{ deliveryAddress: searchRegex }],
                },
                '_id'
            )

            const orderIds = orders.map((order) => order._id)

            filters.$or = [
                { name: searchRegex },
                { lastOrder: { $in: orderIds } },
            ]
        }

        const sort: { [key: string]: any } = {}

        if (sortField && sortOrder) {
            sort[sortField as string] = sortOrder === 'desc' ? -1 : 1
        }

        const options = {
            sort,
            skip: (Number(page) - 1) * Number(limit),
            limit: Number(limit),
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / Number(limit))

        res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: Number(page),
                pageSize: Number(limit),
            },
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Get /customers/:id
export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const customerId = sanitizeValue(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new BadRequestError('Некорректный ID пользователя');
    }
    try {
        const user = await User.findById(customerId).populate([
            'orders',
            'lastOrder',
        ])
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Patch /customers/:id
export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const dataToUpdate = { ...req.body }

        if (dataToUpdate.name) {
            dataToUpdate.name = sanitize(dataToUpdate.name, 'strict')
        }
        if (dataToUpdate.email) {
            dataToUpdate.email = sanitize(dataToUpdate.email, 'strict')
        }
        if (dataToUpdate.phone) {
            dataToUpdate.phone = sanitize(dataToUpdate.phone, 'strict')
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])
        res.status(200).json(updatedUser)
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Delete /customers/:id
export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.status(200).json(deletedUser)
    } catch (error) {
        next(error)
    }
}
