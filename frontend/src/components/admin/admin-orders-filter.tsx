import { ordersActions, ordersSelector } from '@slices/orders'
import { useActionCreators, useDispatch, useSelector } from '@store/hooks'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchOrdersWithFilters } from '../../services/slice/orders/thunk'
import { AppRoute } from '../../utils/constants'
import Filter from '../filter'
import styles from './admin.module.scss'
import { ordersFilterFields } from './helpers/ordersFilterFields'

type FilterValue = string | number | { value: string };

const getFilterValue = (val: FilterValue): string => {
    if (typeof val === 'object' && val !== null && 'value' in val) {
        return val.value;
    }
    return String(val);
};

export default function AdminFilterOrders() {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [_, setSearchParams] = useSearchParams()

    const { updateFilter, clearFilters } = useActionCreators(ordersActions)
    const filterOrderOption = useSelector(ordersSelector.selectFilterOption)

    const handleFilter = (filters: Record<string, FilterValue>) => {
        const processedFilters: Record<string, string> = {};
        Object.keys(filters).forEach((key) => {
            processedFilters[key] = getFilterValue(filters[key]);
        });
        dispatch(updateFilter(processedFilters))
        const queryParams: { [key: string]: string } = {}
        Object.entries(processedFilters).forEach(([key, value]) => {
            if (value) {
                queryParams[key] =
                    value
            }
        })
        setSearchParams(queryParams)
        navigate(
            `${AppRoute.AdminOrders}?${new URLSearchParams(queryParams).toString()}`
        )
    }

    const handleClearFilters = () => {
        dispatch(clearFilters())
        setSearchParams({})
        dispatch(fetchOrdersWithFilters({}))
        navigate(AppRoute.AdminOrders)
    }

    return (
        <>
            <h2 className={styles.admin__title}>Фильтры</h2>
            <Filter
                fields={ordersFilterFields}
                onFilter={handleFilter}
                onClear={handleClearFilters}
                defaultValue={filterOrderOption}
            />
        </>
    )
}
