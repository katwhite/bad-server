import escapeRegExp from "./escapeRegExp";
import { sanitizeValue } from "./guard";

describe('sanitizeValue', () => {
    test('должен пропустить примитивные значения', () => {
        expect(sanitizeValue('hello')).toBe('hello');
        expect(sanitizeValue(42)).toBe(42);
        expect(sanitizeValue(true)).toBe(true);
        expect(sanitizeValue(null)).toBe(null);
        expect(sanitizeValue(undefined)).toBe(undefined);
    });

    test('должен удалить ключи, начинающиеся с $', () => {
        const obj = {
            name: 'John',
            $ne: 'evil',
            email: 'john@test.com',
            $where: '1==1'
        };
        const result = sanitizeValue(obj);
        expect(result).toEqual({
            name: 'John',
            email: 'john@test.com'
        });
        expect(result).not.toHaveProperty('$ne');
        expect(result).not.toHaveProperty('$where');
    });

    test('должен рекурсивно очищать вложенные объекты', () => {
        const obj = {
            user: {
                name: 'Alice',
                $gt: 100
            },
            $or: [{ role: 'admin' }]
        };
        const result = sanitizeValue(obj);
        expect(result).toEqual({
            user: { name: 'Alice' }
        });
        expect(result).not.toHaveProperty('$or');
    });

    test('должен обрабатывать массивы', () => {
        const arr = ['value', { $ne: 'bad' }, 123];
        const result = sanitizeValue(arr);
        expect(result).toEqual(['value', 123]);
        // второй элемент, содержащий оператор, должен быть удалён
    });

    test('должен пропускать даты', () => {
        const date = new Date();
        expect(sanitizeValue(date)).toBe(date);
    });

    test('должен удалить $ операторы во вложенных объектах', () => {
        const obj = {
            user: {
                name: 'Alice',
                filter: { $gt: 10 }
            },
            data: { $ne: null }
        };
        const result = sanitizeValue(obj);
        expect(result).toEqual({
            user: { name: 'Alice' }
        });
        expect(result).not.toHaveProperty('data');
    });
});

describe('escapeRegExp', () => {
    test('должен экранировать спецсимволы', () => {
        expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    test('должен пропустить безопасные строки', () => {
        expect(escapeRegExp('hello world')).toBe('hello world');
    });
});
