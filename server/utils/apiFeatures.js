/**
 * API Features — Reusable helpers for pagination, filtering, sorting, and search
 * 
 * Usage in controllers:
 *   const features = new APIFeatures(Model.find(), req.query)
 *     .filter()
 *     .search(['companyName', 'role'])
 *     .sort()
 *     .paginate();
 *   const docs = await features.query.populate('...');
 */
class APIFeatures {
    constructor(query, queryString) {
        this.query       = query;
        this.queryString = queryString;
    }

    /** Remove reserved fields and apply MongoDB comparison operators */
    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
        excludedFields.forEach((el) => delete queryObj[el]);

        // Convert gte/gt/lte/lt → $gte/$gt/$lte/$lt
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    /** Full-text search on specified fields */
    search(fields = []) {
        if (this.queryString.search) {
            const regex = new RegExp(this.queryString.search, 'i');
            const searchConditions = fields.map((field) => ({ [field]: { $regex: regex } }));
            this.query = this.query.find({ $or: searchConditions });
        }
        return this;
    }

    /** Sort results (default: newest first) */
    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    /** Field selection */
    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        }
        return this;
    }

    /** Paginate (default: 20 per page) */
    paginate() {
        const page  = parseInt(this.queryString.page,  10) || 1;
        const limit = parseInt(this.queryString.limit, 10) || 20;
        const skip  = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        this._page  = page;
        this._limit = limit;
        return this;
    }

    /** Get pagination metadata (call after executing query separately for count) */
    getPaginationMeta(total) {
        const page  = this._page  || 1;
        const limit = this._limit || 20;
        return {
            currentPage: page,
            totalPages:  Math.ceil(total / limit),
            totalItems:  total,
            itemsPerPage: limit,
            hasNextPage:  page * limit < total,
            hasPrevPage:  page > 1,
        };
    }
}

module.exports = APIFeatures;
