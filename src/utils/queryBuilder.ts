export interface BaseQueryParams {
    page?: number | string;
    limit?: number | string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    [key: string]: unknown;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface QueryBuilderConfig {
    /** Fields to search case-insensitively using OR logic when `search` query parameter is provided */
    searchableFields?: string[];
    /** Exact match filter fields (enums, booleans, IDs, numbers) */
    exactFilterFields?: string[];
    /** Substring match filter fields using case-insensitive contains */
    caseInsensitiveFilterFields?: string[];
    /** Default field to sort by if not provided in query (defaults to 'createdAt') */
    defaultSortBy?: string;
    /** Default sort order if not provided in query (defaults to 'desc') */
    defaultSortOrder?: 'asc' | 'desc';
    /** Invariant static WHERE filters that can never be bypassed (e.g., { status: 'ACTIVE' }) */
    baseWhere?: Record<string, unknown>;
}

export interface BuiltPrismaQuery<TWhere = Record<string, unknown>> {
    where: TWhere;
    skip: number;
    take: number;
    orderBy: Record<string, 'asc' | 'desc'>;
    pagination: {
        page: number;
        limit: number;
    };
}

/**
 * Build standardized Prisma query options (where, skip, take, orderBy)
 * from incoming HTTP request query parameters.
 */
export function buildPrismaQuery<TWhere = Record<string, unknown>>(
    query: BaseQueryParams,
    config: QueryBuilderConfig = {},
): BuiltPrismaQuery<TWhere> {
    // 1. Pagination calculation (guaranteed bounds)
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const take = limit;

    // 2. Sorting calculation
    const sortBy = (query.sortBy as string) || config.defaultSortBy || 'createdAt';
    const sortOrder: 'asc' | 'desc' =
        (query.sortOrder as 'asc' | 'desc') || config.defaultSortOrder || 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // 3. WHERE condition assembly
    const whereConditions: Record<string, unknown>[] = [];

    // 3a. Invariant base conditions
    if (config.baseWhere && Object.keys(config.baseWhere).length > 0) {
        whereConditions.push(config.baseWhere);
    }

    // 3b. Free-text search across designated searchable fields
    if (query.search && config.searchableFields && config.searchableFields.length > 0) {
        const searchVal = String(query.search).trim();
        if (searchVal.length > 0) {
            whereConditions.push({
                OR: config.searchableFields.map((field) => ({
                    [field]: {
                        contains: searchVal,
                        mode: 'insensitive',
                    },
                })),
            });
        }
    }

    // 3c. Exact equality filter fields (enums, booleans, IDs, numbers)
    if (config.exactFilterFields) {
        for (const field of config.exactFilterFields) {
            const val = query[field];
            if (val !== undefined && val !== null && val !== '') {
                whereConditions.push({ [field]: val });
            }
        }
    }

    // 3d. Case-insensitive substring filter fields (e.g. district, area)
    if (config.caseInsensitiveFilterFields) {
        for (const field of config.caseInsensitiveFilterFields) {
            const val = query[field];
            if (val !== undefined && val !== null && val !== '') {
                whereConditions.push({
                    [field]: {
                        contains: String(val).trim(),
                        mode: 'insensitive',
                    },
                });
            }
        }
    }

    const where = (whereConditions.length > 0 ? { AND: whereConditions } : {}) as TWhere;

    return {
        where,
        skip,
        take,
        orderBy,
        pagination: {
            page,
            limit,
        },
    };
}

/**
 * Compute standardized pagination metadata from total record count and query limits.
 */
export function calculatePaginationMeta(
    totalCount: number,
    page: number,
    limit: number,
): PaginationMeta {
    const totalPages = Math.ceil(totalCount / limit) || 1;
    return {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
}
