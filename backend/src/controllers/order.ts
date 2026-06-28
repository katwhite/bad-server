import { NextFunction, Request, Response } from 'express'
import mongoose, { Error as MongooseError, Types } from 'mongoose'

import Order, { IOrder } from '../models/order'
import Product, { IProduct } from '../models/product'
import User from '../models/user'
import { sanitize, sanitizeDateRange, sanitizeNumberRange, sanitizeValue, validateQueryComplexity } from '../utils/guard'
import escapeRegExp from '../utils/escapeRegExp'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'

// eslint-disable-next-line max-len
// GET /orders?page=2&limit=5&sort=totalAmount&order=desc&orderDateFrom=2024-07-01&orderDateTo=2024-08-01&status=delivering&totalAmountFrom=100&totalAmountTo=1000&search=%2B1

export const getOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Проверка на наличие операторов MongoDB в query-параметрах
        const hasDollarOperators = (obj: any): boolean => {
            if (typeof obj !== 'object' || obj === null) return false;
            for (const key in obj) {
                if (key.startsWith('$')) return true;
                if (typeof obj[key] === 'object' && hasDollarOperators(obj[key])) return true;
            }
            return false;
        };

        if (hasDollarOperators(req.query)) {
            throw new BadRequestError('Некорректные параметры запроса');
        }
        if (req.originalUrl.includes('$')) {
            throw new BadRequestError('Некорректные параметры запроса');
        }
        // const sanitizedQuery = sanitizeValue(req.query)
        // const {
        //     page = 1,
        //     limit = 10,
        //     sortField = 'createdAt',
        //     sortOrder = 'desc',
        //     status,
        //     totalAmountFrom,
        //     totalAmountTo,
        //     orderDateFrom,
        //     orderDateTo,
        //     search,
        // } = sanitizedQuery
        const {
            page,
            limit,
            sortField = 'createdAt',
            sortOrder = 'desc',
            status,
            totalAmountFrom,
            totalAmountTo,
            orderDateFrom,
            orderDateTo,
            search,
        } = req.query

        // const queryParams = req.query;
        if (Object.keys(req.query).length > 20) {
            throw new BadRequestError('Слишком много параметров запроса');
        }

        const filters: Record<string, any> = {}
        const safeLimit = Math.min(Number(limit) || 10, 10);
        const safePage = Math.max(1, Number(page) || 1);

        if (status) {
            if (typeof status === 'object' && !Array.isArray(status)) {
                const sanitizedStatus = sanitizeValue(status)
                if (sanitizedStatus) {
                    filters.status = sanitizedStatus
                }
            }
            if (typeof status === 'string') {
                const sanitizedStatus = sanitize(status, 'strict')
                if (sanitizedStatus) {
                    filters.status = sanitizedStatus
                }
            }
        }

        const totalAmountFilter = sanitizeNumberRange(
            totalAmountFrom,
            totalAmountTo,
            0
        )

        if (totalAmountFilter) {
            filters.totalAmount = totalAmountFilter
        }

        const OrderDateFilter = sanitizeDateRange(
            orderDateFrom,
            orderDateTo,
            undefined,
            new Date()
        )

        if (OrderDateFilter) {
            filters.createdAt = OrderDateFilter
        }

        const aggregatePipeline: any[] = [
            { $match: filters },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products',
                    foreignField: '_id',
                    as: 'products',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: '$customer' },
            { $unwind: '$products' },
        ]

        if (search) {
            const sanitizedSearch = sanitize(search as string, 'strict')
            const escapedSearch = escapeRegExp(sanitizedSearch)
            const searchRegex = new RegExp(escapedSearch as string, 'i')
            const searchNumber = Number(sanitizedSearch)

            const searchConditions: any[] = [{ 'products.title': searchRegex }]

            if (!Number.isNaN(searchNumber)) {
                searchConditions.push({ orderNumber: searchNumber })
            }

            aggregatePipeline.push({
                $match: {
                    $or: searchConditions,
                },
            })

            filters.$or = searchConditions
        }

        const allowedSortFields = [
            'createdAt',
            'orderNumber',
            'totalAmount',
            'status',
        ]

        if (
            typeof sortField !== 'string' ||
            allowedSortFields.indexOf(sortField) === -1
        ) {
            return next(
                new BadRequestError('Некорректное поле сортировки')
            )
        }

        const sort: { [key: string]: 1 | -1 } = {}

        sort[sortField] = sortOrder === 'desc' ? -1 : 1

        // validateQueryComplexity(filters);

        aggregatePipeline.push(
            { $sort: sort },
            { $skip: (Number(safePage) - 1) * Number(safeLimit) },
            { $limit: Number(safeLimit) },
            {
                $group: {
                    _id: '$_id',
                    orderNumber: { $first: '$orderNumber' },
                    status: { $first: '$status' },
                    totalAmount: { $first: '$totalAmount' },
                    products: { $push: '$products' },
                    customer: { $first: '$customer' },
                    createdAt: { $first: '$createdAt' },
                },
            }
        )

        const orders = await Order.aggregate(aggregatePipeline)
        const totalOrders = await Order.countDocuments(filters)
        const totalPages = Math.ceil(totalOrders / Number(safeLimit))

        res.status(200).json({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: Number(safePage),
                pageSize: Number(safeLimit),
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getOrdersCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { search, page = 1, limit = 5 } = req.query
        const safeLimit = Math.min(Number(limit) || 10, 10);
        const safePage = Math.max(1, Number(page) || 1);
        const options = {
            skip: (Number(safePage) - 1) * Number(safeLimit),
            limit: Number(safeLimit),
        }

        const user = await User.findById(userId)
            .populate({
                path: 'orders',
                populate: [
                    {
                        path: 'products',
                    },
                    {
                        path: 'customer',
                    },
                ],
            })
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        let orders = user.orders as unknown as IOrder[]

        if (search) {
            // если не экранировать то получаем Invalid regular expression: /+1/i: Nothing to repeat
            const sanitizedSearch = sanitize(search as string, 'strict')
            const escapedSearch = escapeRegExp(sanitizedSearch)
            const searchRegex = new RegExp(escapedSearch as string, 'i')
            const searchNumber = Number(sanitizedSearch)
            const products = await Product.find({ title: searchRegex })
            const productIds = products.map((product) => product._id)

            orders = orders.filter((order) => {
                // eslint-disable-next-line max-len
                const matchesProductTitle = order.products.some((product) =>
                    productIds.some((id) => id.equals(product._id))
                )
                // eslint-disable-next-line max-len
                const matchesOrderNumber =
                    !Number.isNaN(searchNumber) &&
                    order.orderNumber === searchNumber

                return matchesOrderNumber || matchesProductTitle
            })
        }

        const totalOrders = orders.length
        const totalPages = Math.ceil(totalOrders / Number(safeLimit))

        orders = orders.slice(options.skip, options.skip + options.limit)

        return res.send({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: Number(safePage),
                pageSize: Number(safeLimit),
            },
        })
    } catch (error) {
        next(error)
    }
}

// Get order by ID
export const getOrderByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const orderNumber = sanitizeValue(req.params.orderNumber);
        if (typeof orderNumber !== 'number') {
            throw new BadRequestError('Неверный формат номера заказа');
        }
        const order = await Order.findOne({
            orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

export const getOrderCurrentUserByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
            const orderNumber = sanitizeValue(req.params.orderNumber);
            if (typeof orderNumber !== 'number') {
                throw new BadRequestError('Неверный формат номера заказа');
            }
            const userId = res.locals.user._id
            const order = await Order.findOne({
                orderNumber,
            })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
        if (!order.customer._id.equals(userId)) {
            // Если нет доступа не возвращаем 403, а отдаем 404
            return next(
                new NotFoundError('Заказ по заданному id отсутствует в базе')
            )
        }
        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

// POST /product
export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const basket: IProduct[] = []
        const products = await Product.find<IProduct>({})
        const userId = res.locals.user._id
        const { address, payment, phone, total, email, items, comment } =
            req.body

        const sanitizedAddress = sanitize(address, 'strict')
        const sanitizedPhone = sanitize(phone, 'strict')
        const sanitizedEmail = sanitize(email, 'strict')
        const sanitizedComment = sanitize(comment || '', 'strict')
        const sanitizedItems = sanitizeValue(items);
        if (!Array.isArray(sanitizedItems)) {
            throw new BadRequestError('Неверный формат корзины');
        }
        sanitizedItems.forEach(id => {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new BadRequestError(`Некорректный ID товара: ${id}`);
            }
        })

        sanitizedItems.forEach((id: Types.ObjectId) => {
            const product = products.find((p) => p._id.equals(id))
            if (!product) {
                throw new BadRequestError(`Товар с id ${id} не найден`)
            }
            if (product.price === null) {
                throw new BadRequestError(`Товар с id ${id} не продается`)
            }
            return basket.push(product)
        })
        const totalBasket = basket.reduce((a, c) => a + c.price, 0)
        if (totalBasket !== total) {
            return next(new BadRequestError('Неверная сумма заказа'))
        }

        const newOrder = new Order({
            totalAmount: total,
            products: sanitizedItems,
            payment,
            phone: sanitizedPhone,
            email: sanitizedEmail,
            comment: sanitizedComment,
            customer: userId,
            deliveryAddress: sanitizedAddress,
        })
        const populateOrder = await newOrder.populate(['customer', 'products'])
        await populateOrder.save()

        return res.status(200).json(populateOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        return next(error)
    }
}

// Update an order
export const updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const orderNumber = sanitizeValue(req.params.orderNumber);
        if (typeof orderNumber !== 'number') {
            throw new BadRequestError('Неверный формат номера заказа');
        }
        const sanitizedStatus = sanitize(req.body.status, 'strict');
        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber },
            { status: sanitizedStatus },
            { new: true, runValidators: true }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])
        return res.status(200).json(updatedOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

// Delete an order
export const deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const orderId = sanitizeValue(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new BadRequestError('Некорректный ID заказа');
        }
        const deletedOrder = await Order.findByIdAndDelete(orderId)
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])
        return res.status(200).json(deletedOrder)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}
