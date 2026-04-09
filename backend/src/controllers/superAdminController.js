import { table } from '../db/lancedb.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ApiUsage from '../models/ApiUsage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getDirSize = (dirPath) => {
    let size = 0;
    try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                size += getDirSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {
        return 0;
    }
    return size;
};

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// @desc    Get all data from vector DB with optional filters
// @route   GET /api/super-admin/vector-db
// @access  Private/SuperAdmin
export const getVectorDbData = async (req, res, next) => {
    try {
        const { entity, policy } = req.query;

        // Prevent caching
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

        let query = table.query();

        // Build filter string for LanceDB
        let filters = [];
        if (entity && entity !== 'All Entities') {
            filters.push(`entity LIKE '%${entity}%'`);
        }
        if (policy && policy !== 'All Policies') {
            filters.push(`policy = '${policy}'`);
        }

        if (filters.length > 0) {
            query = query.where(filters.join(' AND '));
        }

        const results = await query.limit(1000).toArray();

        // remove vector data to save bandwidth
        const minimized = results.map(({ vector, ...rest }) => rest);

        const dbPath = path.join(__dirname, '../../policy_db');
        let dbSize = 'Unknown';
        try {
            if (fs.existsSync(dbPath)) {
                // Recursive function to get total size of directory
                const getAllFiles = (dir) => {
                    const files = fs.readdirSync(dir);
                    let size = 0;
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        const stats = fs.statSync(filePath);
                        if (stats.isDirectory()) {
                            size += getAllFiles(filePath);
                        } else {
                            size += stats.size;
                        }
                    }
                    return size;
                };

                const sizeInBytes = getAllFiles(dbPath);
                dbSize = formatBytes(sizeInBytes);
            }
        } catch (err) {
            console.error("Error calculating DB size:", err);
        }

        res.status(200).json({
            success: true,
            count: minimized.length,
            dbSize,
            data: minimized
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Optimize Vector DB (Compact & Cleanup)
// @route   POST /api/super-admin/vector-db/optimize
// @access  Private/SuperAdmin (for now)
export const optimizeVectorDb = async (req, res, next) => {
    try {
        const { optimizeVectorDb } = await import('../services/chunkService.js');
        const result = await optimizeVectorDb();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// @desc    Get API usage statistics with cost analysis
// @route   GET /api/super-admin/api-cost
// @access  Private/SuperAdmin
export const getApiUsageStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        // Aggregate totals
        const totals = await ApiUsage.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalCost: { $sum: "$cost" },
                    totalPromptTokens: { $sum: "$promptTokens" },
                    totalCompletionTokens: { $sum: "$completionTokens" },
                    totalTokens: { $sum: "$totalTokens" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Group by model
        const byModel = await ApiUsage.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$model",
                    tokens: { $sum: "$totalTokens" },
                    cost: { $sum: "$cost" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { cost: -1 } }
        ]);

        // Group by operation
        const byOperation = await ApiUsage.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$operation",
                    tokens: { $sum: "$totalTokens" },
                    cost: { $sum: "$cost" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { cost: -1 } }
        ]);

        // Daily breakdown for charts
        const daily = await ApiUsage.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    cost: { $sum: "$cost" },
                    tokens: { $sum: "$totalTokens" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: totals[0] || { totalCost: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, count: 0 },
                byModel,
                byOperation,
                daily
            }
        });
    } catch (err) {
        next(err);
    }
};
