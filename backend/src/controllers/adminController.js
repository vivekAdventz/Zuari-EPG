import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Entity from '../models/Entity.js';
import Policy from '../models/Policy.js';
import Log from '../models/Log.js';
import Message from '../models/Message.js';
import EmployeeCategory from '../models/EmployeeCategory.js';
import ImpactLevel from '../models/ImpactLevel.js';
import QuestionTheme from '../models/QuestionTheme.js';
// We will need a service to handle chunking logic, but for now we can simulate or create a placeholder
import { processPolicyFile, publishPolicy as publishPolicyService, deleteChunks } from '../services/chunkService.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authService from '../services/authService.js';
import FAQ from '../models/FAQ.js';
import aiService from '../services/aiService.js';
import Ticket from '../models/Ticket.js';
import TicketMessage from '../models/TicketMessage.js';


// @desc    Get Admin Dashboard Statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
    try {
        const totalEmployees = await User.countDocuments({ roles: 'employee' });
        const totalEntities = await Entity.countDocuments();
        const totalInteractions = await Message.countDocuments({ role: 'user' });
        const activePolicies = await Policy.countDocuments({ status: 'live' });
        const totalPolicies = await Policy.countDocuments();

        // Get recent activity (e.g. last 5 conversations)
        const recentActivity = await Conversation.find()
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('userId', 'name email entity');

        // Get interaction analysis (messages per user - simple aggregation)
        // This is a placeholder for more complex analysis, currently just returning counts

        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                totalEntities,
                totalInteractions,
                activePolicies,
                totalPolicies,
                recentActivity
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all non-admin users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
    try {
        // Fetch all users who are NOT superAdmin, populate linked config refs
        const users = await User.find({ roles: { $not: { $all: ['superAdmin'] }, $nin: [] } })
            .select('-password')
            .populate('entity', 'name entityCode')
            .populate('level', 'name')
            .populate('empCategory', 'name code')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }

};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await User.findByIdAndDelete(req.params.id);

            // Cascade delete user conversations and messages
            await Conversation.deleteMany({ userId: user._id });
            await Message.deleteMany({ userId: user._id });

            // Log User Deletion
            await Log.create({
                logDescription: `User Deleted: ${user.name}`,
                userId: req.user._id,
                name: req.user.name,
                role: req.user.roles?.join(', ') || 'employee',
                entity: req.user.entity
            });

            res.json({ message: 'User removed' });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.entity = req.body.entity !== undefined ? (req.body.entity || null) : user.entity;
            user.entity_code = req.body.entity_code ?? user.entity_code;
            user.level = req.body.level !== undefined ? (req.body.level || null) : user.level;
            user.empCategory = req.body.empCategory !== undefined ? (req.body.empCategory || null) : user.empCategory;
            user.status = req.body.status || user.status;

            if (req.body.assignedThemes !== undefined) {
                user.assignedThemes = req.body.assignedThemes;
            }

            if (req.body.roles && Array.isArray(req.body.roles) && req.body.roles.length > 0) {
                user.roles = req.body.roles;
            }

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            // Log Update
            await Log.create({
                logDescription: `User Updated: ${updatedUser.name}`,
                userId: req.user._id,
                name: req.user.name,
                role: req.user.roles?.join(', ') || 'employee',
                entity: req.user.entity
            });

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                roles: updatedUser.roles,
                entity: updatedUser.entity,
                entity_code: updatedUser.entity_code,
                level: updatedUser.level,
                empCategory: updatedUser.empCategory,
                status: updatedUser.status,
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};


// @desc    Get all conversations/interactions
// @route   GET /api/admin/interactions
// @access  Private/Admin
const getInteractions = async (req, res, next) => {
    try {
        const { entity, name, startDate, endDate } = req.query;

        let userQuery = {};
        let hasUserFilters = false;

        if (entity && entity !== 'All Entities') {
            userQuery.entity = entity;
            hasUserFilters = true;
        }
        if (name) {
            userQuery.name = { $regex: name, $options: 'i' };
            hasUserFilters = true;
        }

        let conversationQuery = {};

        // If filtering by user attributes
        if (hasUserFilters) {
            const users = await User.find(userQuery).select('_id');

            // If no users match criteria, return empty interactions immediately
            if (users.length === 0) {
                return res.status(200).json({ success: true, data: [] });
            }
            const userIds = users.map(user => user._id);
            conversationQuery.userId = { $in: userIds };
        }

        // Date filtering
        if (startDate || endDate) {
            conversationQuery.updatedAt = {};
            if (startDate) {
                // Parse as local start of day
                conversationQuery.updatedAt.$gte = new Date(`${startDate}T00:00:00`);
            }
            if (endDate) {
                // Parse as local end of day
                conversationQuery.updatedAt.$lte = new Date(`${endDate}T23:59:59.999`);
            }
        }

        const interactions = await Conversation.find(conversationQuery)
            .populate('userId', 'name email entity')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            data: interactions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all entities
// @route   GET /api/admin/entities
// @access  Private/Admin
const getEntities = async (req, res, next) => {
    try {
        const entities = await Entity.find().sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: entities
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new entity
// @route   POST /api/admin/entities
// @access  Private/Admin
const createEntity = async (req, res, next) => {
    try {
        const { name } = req.body;
        let { entityCode } = req.body;

        if (!name) {
            res.status(400);
            throw new Error('Entity name is required');
        }

        // Hardcoded Entity Map
        const entityMap = {
            'Zuari Industries Ltd': 'ZIL',
            'Zuari Infraworld India Ltd': 'ZIIL',
            'Simon India Ltd': 'SIL',
            'Zuari International': 'ZIntL',
            'Zuari Finserv Ltd': 'ZFL',
            'Zuari Insurance Brokers Ltd': 'ZIBL',
            'Zuari Management Services Ltd': 'ZMSL',
            'Forte Furniture Products India Pvt Ltd': 'FFPL',
            'Indian Furniture Private Ltd': 'IFPL',
            'Zuari Envien Bioenergy Pvt Ltd': 'ZEBPL'
        };

        // If entityCode not provided, try to look it up from map
        if (!entityCode) {
            entityCode = entityMap[name];
        }

        // If still no entityCode, we can either error or auto-generate/require it.
        // For now, let's require it if not in map, or maybe allow null if schema allows (but schema required=true).
        if (!entityCode) {
            // Option: Generate from name initials? Or require user input.
            // Let's return error asking for code if not found in map.
            res.status(400);
            throw new Error('Entity Code is required for unknown entities.');
        }

        const existingEntity = await Entity.findOne({
            $or: [{ name }, { entityCode }]
        });

        if (existingEntity) {
            res.status(400);
            throw new Error('Entity with this Name or Code already exists');
        }

        const entity = await Entity.create({ name, entityCode });

        // Log Entity Creation
        await Log.create({
            logDescription: `Entity Created: ${name} (${entityCode})`,
            userId: req.user._id,
            name: req.user.name,
            role: req.user.role,
            entity: req.user.entity
        });

        res.status(201).json({
            success: true,
            data: entity
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an entity
// @route   DELETE /api/admin/entities/:id
// @access  Private/Admin
const deleteEntity = async (req, res, next) => {
    try {
        const entityToDelete = await Entity.findById(req.params.id);


        if (entityToDelete) {
            await Entity.findByIdAndDelete(req.params.id);

            // Log Entity Deletion
            await Log.create({
                logDescription: `Entity Deleted: ${entityToDelete.name}`,
                userId: req.user._id,
                name: req.user.name,
                role: req.user.roles?.join(', ') || 'employee',
                entity: req.user.entity
            });

            res.status(200).json({
                success: true,
                message: 'Entity deleted successfully'
            });
        } else {
            res.status(404);
            throw new Error('Entity not found')
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update an entity
// @route   PUT /api/admin/entities/:id
// @access  Private/Admin
const updateEntity = async (req, res, next) => {
    try {
        const entity = await Entity.findById(req.params.id);

        if (entity) {
            const oldName = entity.name;
            entity.name = req.body.name || entity.name;

            // Hardcoded Entity Map
            const entityMap = {
                'Zuari Industries Ltd': 'ZIL',
                'Zuari Infraworld India Ltd': 'ZIIL',
                'Simon India Ltd': 'SIL',
                'Zuari International': 'ZIntL',
                'Zuari Finserv Ltd': 'ZFL',
                'Zuari Insurance Brokers Ltd': 'ZIBL',
                'Zuari Management Services Ltd': 'ZMSL',
                'Forte Furniture Products India Pvt Ltd': 'FFPL',
                'Indian Furniture Private Ltd': 'IFPL',
                'Zuari Envien Bioenergy Pvt Ltd': 'ZEBPL'
            };

            // If name changed, try to update code from map
            if (req.body.name && req.body.name !== oldName) {
                if (entityMap[req.body.name]) {
                    entity.entityCode = entityMap[req.body.name];
                }
                // If not in map, we keep the old code? Or do we want to force user to provide one?
                // Current UI doesn't allow editing code. So we just leave it unless mapped.
            }

            const updatedEntity = await entity.save();

            // Log Update
            await Log.create({
                logDescription: `Entity Updated: ${oldName} -> ${updatedEntity.name} (${updatedEntity.entityCode})`,
                userId: req.user._id,
                name: req.user.name,
                role: req.user.roles?.join(', ') || 'employee',
                entity: req.user.entity
            });

            res.json(updatedEntity);
        } else {
            res.status(404);
            throw new Error('Entity not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get all active policies (excluding archived)
// @route   GET /api/admin/policies
// @access  Private/Admin
const getPolicies = async (req, res, next) => {
    try {
        const policies = await Policy.find({ status: { $ne: 'archived' } }).sort({ uploadDate: -1 });
        res.status(200).json({
            success: true,
            data: policies
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all archived policies
// @route   GET /api/admin/policies/archived
// @access  Private/Admin
const getArchivedPolicies = async (req, res, next) => {
    try {
        const policies = await Policy.find({ status: 'archived' }).sort({ uploadDate: -1 });
        res.status(200).json({
            success: true,
            data: policies
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload a new policy document
// @route   POST /api/admin/upload-policy
// @access  Private/Admin
const uploadPolicy = async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400);
            throw new Error('Please upload a file');
        }

        const { title, category, expiryDate, description } = req.body;
        let { entity, impactLevel, empCategory } = req.body;

        const parseArray = (field) => {
            if (!field) return [];
            try { return JSON.parse(field); } catch (e) { return Array.isArray(field) ? field : [field]; }
        };

        entity = parseArray(entity);
        impactLevel = parseArray(impactLevel);
        empCategory = parseArray(empCategory);

        if (!title || !entity || !entity.length) {
            res.status(400);
            throw new Error('Title and at least one Entity are required');
        }

        const policy = await Policy.create({
            title,
            filename: req.file.filename,
            entity,
            impactLevel,
            empCategory,
            description: description || '',
            category: category || 'General',
            expiryDate: expiryDate || null,
            status: 'draft', // Default status changed to draft to match UI
            hasFaqs: false
        });

        // Trigger FAQ generation asynchronously without blocking the upload response
        aiService.generateDynamicFAQs([policy.title]).then(async (faqs) => {
            if (faqs && faqs.length > 0) {
                await FAQ.create({ policyId: policy._id, faqs });
                await Policy.findByIdAndUpdate(policy._id, { hasFaqs: true });
            }
        }).catch(err => {
            console.error("Failed to generate FAQs on upload:", err);
        });

        res.status(201).json({
            success: true,
            data: policy,
            message: 'Policy uploaded successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Create chunks for a policy
// @route   POST /api/admin/policies/:id/chunk
// @access  Private/Admin
const createChunks = async (req, res, next) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            res.status(404);
            throw new Error('Policy not found');
        }

        // Logic to process file and create chunks
        // This processPolicyFile function needs to be implemented in chunkService.js
        // It should read the file, split it into chunks, and store them in the Policy model
        await processPolicyFile(policy);

        // Refetch policy to ensure we have the latest state (chunks added) and update status
        const updatedPolicy = await Policy.findById(req.params.id);
        updatedPolicy.ischunked = true;
        await updatedPolicy.save();

        await Log.create({
            logDescription: `Policy Chunked: ${policy.title}`,
            userId: req.user._id,
            name: req.user.name,
            role: req.user.roles?.join(', ') || 'employee',
            entity: req.user.entity
        });

        res.status(200).json({
            success: true,
            message: 'Policy process (chunk creation) completed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Publish a policy
// @route   POST /api/admin/policies/:id/publish
// @access  Private/Admin
const publishPolicy = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Call the service to publish (embed and store in vector db)
        await publishPolicyService(id);

        res.status(200).json({
            statusCode: 200,
            success: true,
            message: 'Policy published successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a policy
// @route   DELETE /api/admin/policies/:id
// @access  Private/Admin
const deletePolicy = async (req, res, next) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (policy) {
            // Delete chunks from vector DB
            await deleteChunks(policy.title, policy.entity);

            // Delete FAQs
            await FAQ.deleteMany({ policyId: req.params.id });

            // Delete policy from MongoDB
            await Policy.findByIdAndDelete(req.params.id);

            await Log.create({
                logDescription: `Policy Deleted: ${policy.title}`,
                userId: req.user._id,
                name: req.user.name,
                role: req.user.roles?.join(', ') || 'employee',
                entity: req.user.entity
            });

            res.status(200).json({
                success: true,
                message: 'Policy and associated chunks deleted successfully'
            });
        } else {
            res.status(404);
            throw new Error('Policy not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update a policy
// @route   PUT /api/admin/policies/:id
// @access  Private/Admin
const updatePolicy = async (req, res, next) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            res.status(404);
            throw new Error('Policy not found');
        }

        // Capture original values before update
        const oldTitle = policy.title;
        const oldEntity = policy.entity;
        const oldImpactLevel = policy.impactLevel;
        const oldEmpCategory = policy.empCategory;
        const currentVersion = policy.version || '1.0';

        const { title, category, expiryDate, changeNote, description } = req.body;
        let { entity, impactLevel, empCategory } = req.body;

        const parseArray = (field) => {
            if (!field) return undefined;
            try { return JSON.parse(field); } catch (e) { return Array.isArray(field) ? field : [field]; }
        };

        const newEntity = parseArray(entity);
        const newImpactLevel = parseArray(impactLevel);
        const newEmpCategory = parseArray(empCategory);

        // Create version history entry
        const historyEntry = {
            version: currentVersion,
            updatedAt: new Date(),
            changedBy: req.user.name || 'Admin', // Assuming req.user is populated by auth middleware
            changeNote: changeNote || (req.file ? 'Updated document file' : 'Updated metadata'),
            filename: policy.filename
        };

        // Push to history
        if (!policy.versions) policy.versions = [];
        policy.versions.push(historyEntry);

        // ARCHIVE OLD VERSION: Create a new document for the archived version
        await Policy.create({
            title: `${oldTitle} (v${currentVersion})`,
            filename: policy.filename, // keep old filename
            entity: oldEntity,
            impactLevel: policy.impactLevel,
            empCategory: policy.empCategory,
            description: policy.description,
            category: policy.category,
            uploadDate: policy.uploadDate,
            expiryDate: policy.expiryDate,
            status: 'archived', // Explicitly archived
            version: currentVersion,
            ischunked: policy.ischunked,
            versions: [] // Archived versions start fresh or keep empty history
        });

        // Calculate next version
        const versionParts = currentVersion.split('.').map(Number);
        if (versionParts.length === 2) {
            versionParts[1]++; // Increment minor version
            policy.version = versionParts.join('.');
        } else {
            policy.version = (parseFloat(currentVersion) + 0.1).toFixed(1); // Fallback
        }


        if (title) policy.title = title;
        if (newEntity) policy.entity = newEntity;
        if (newImpactLevel) policy.impactLevel = newImpactLevel;
        if (newEmpCategory) policy.empCategory = newEmpCategory;
        if (description !== undefined) policy.description = description;

        if (category) policy.category = category;
        // Handle date properly, allowing clearing it if sent as null/empty
        if (expiryDate !== undefined) policy.expiryDate = expiryDate;

        // If title, entity, impact level or category changed, delete old chunks from vector DB and reset status
        const titleChanged = title && title !== oldTitle;

        const stringifyIds = (arr) => {
            if (!arr) return JSON.stringify([]);
            return JSON.stringify(arr.map(id => id.toString()).sort());
        };

        const entityChanged = newEntity && stringifyIds(newEntity) !== stringifyIds(oldEntity);
        const impactLevelChanged = newImpactLevel && stringifyIds(newImpactLevel) !== stringifyIds(oldImpactLevel);
        const empCategoryChanged = newEmpCategory && stringifyIds(newEmpCategory) !== stringifyIds(oldEmpCategory);

        if (titleChanged || entityChanged || impactLevelChanged || empCategoryChanged) {
            // we delete by the stringified format that lance expects which corresponds to Array.isArray(entity) ? entity.join(',') : entity
            const oldEntityStr = Array.isArray(oldEntity) ? oldEntity.join(',') : String(oldEntity || '');
            await deleteChunks(oldTitle, oldEntityStr);
            policy.ischunked = false;
            policy.chunks = [];
            policy.status = 'draft';
        }

        if (req.file) {
            // If file changed, we MUST wipe vectors because content is new.
            await deleteChunks(oldTitle, oldEntity);

            policy.filename = req.file.filename;
            // If file is updated, reset chunked status as content changed
            policy.ischunked = false;
            policy.chunks = []; // Clear existing chunks
            policy.status = 'draft'; // Reset to draft on file change as shown in requirements usually
        }

        const updatedPolicy = await policy.save();

        await Log.create({
            logDescription: `Policy Updated: ${updatedPolicy.title} to v${updatedPolicy.version}`,
            userId: req.user._id,
            name: req.user.name,
            role: req.user.roles?.join(', ') || 'employee',
            entity: req.user.entity
        });

        res.status(200).json({
            success: true,
            data: updatedPolicy,
            message: 'Policy updated successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get system logs with filters
// @route   GET /api/admin/logs
// @access  Private/Admin
const getLogs = async (req, res, next) => {
    try {
        const { employeeName, startDate, endDate, entity } = req.query;

        let query = {};

        // Only allow superAdmins to see superAdmin logs
        if (req.user && !req.user.roles?.includes('superAdmin')) {
            query.role = { $not: /superAdmin/i };
        }

        if (employeeName) {
            query.name = { $regex: employeeName, $options: 'i' };
        }

        if (entity && entity !== 'All Entities') {
            query.entity = entity;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                // Parse as local start of day
                query.createdAt.$gte = new Date(`${startDate}T00:00:00`);
            }
            if (endDate) {
                // Parse as local end of day
                query.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
            }
        }

        const logs = await Log.find(query)
            .populate('entity', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error) {
        next(error);
    }
}

// @desc    Generate FAQs for a policy manually
// @route   POST /api/admin/policies/:id/faqs/generate
// @access  Private/Admin
const generatePolicyFaqs = async (req, res, next) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            res.status(404);
            throw new Error('Policy not found');
        }

        // Delete any existing FAQs for safety before generating new ones
        await FAQ.deleteMany({ policyId: policy._id });

        const faqs = await aiService.generateDynamicFAQs([policy.title]);
        if (faqs && faqs.length > 0) {
            await FAQ.create({ policyId: policy._id, faqs });
            policy.hasFaqs = true;
            await policy.save();
            res.status(201).json({ success: true, message: 'FAQs generated successfully', data: faqs });
        } else {
            res.status(400);
            throw new Error("Unable to generate FAQs");
        }
    } catch (error) {
        next(error);
    }
};


// @desc    Download employee CSV template
// @route   GET /api/admin/download-template
// @access  Private/Admin
const downloadEmployeeTemplate = async (req, res, next) => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const file = path.join(__dirname, '../../uploads/csv_template/template.xlsx');
        res.download(file);
    } catch (error) {
        next(error);
    }
};

// @desc    Upload & preview employees via CSV (Validates without saving)
// @route   POST /api/admin/preview-employees-csv
// @access  Private/Admin
const previewEmployeesCsv = async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400);
            return next(new Error('Please upload a file'));
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const results = XLSX.utils.sheet_to_json(worksheet);

        try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Error deleting temp file", e); }

        if (results.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No records found in the file",
                errors: ["File appears to be empty or effectively empty"]
            });
        }

        const entities = await Entity.find({}, '_id name entityCode');
        const categories = await EmployeeCategory.find({}, '_id name code');
        const impactLevels = await ImpactLevel.find({}, '_id name entity');

        const entityMap = {};
        entities.forEach(e => {
            if (e.name) entityMap[e.name.toLowerCase()] = e;
            if (e.entityCode) entityMap[e.entityCode.toLowerCase()] = e;
        });

        const categoryMap = {};
        categories.forEach(c => {
            if (c.name) categoryMap[c.name.toLowerCase()] = c;
            if (c.code) categoryMap[c.code.toLowerCase()] = c;
        });

        const impactLevelMap = {};
        impactLevels.forEach(il => {
            if (il.name && il.entity) {
                let key = `${il.name.toLowerCase()}_${il.entity.toString()}`;
                impactLevelMap[key] = il;
            }
            if (il.name && !impactLevelMap[il.name.toLowerCase()]) {
                impactLevelMap[il.name.toLowerCase()] = il;
            }
        });

        const validationResults = [];
        let validCount = 0;

        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[key.trim().toLowerCase().replace(/ /g, '_')] = row[key];
            });

            const name = normalizedRow.full_name || normalizedRow.name || normalizedRow.employee_name;
            const email = normalizedRow.email || normalizedRow.email_address;
            const role = (normalizedRow.role || 'employee').toLowerCase();
            const entityStr = normalizedRow.entity_name || normalizedRow.entity || normalizedRow.company;
            const levelStr = normalizedRow.employee_level || normalizedRow.level || normalizedRow.grade;
            const categoryStr = normalizedRow.category || normalizedRow.emp_category || normalizedRow.employee_category;
            const status = (normalizedRow.status || 'active').toLowerCase();
            const entityCodeStr = normalizedRow.entity_code || normalizedRow.code || normalizedRow.entity;
            const password = normalizedRow.password || 'Welcome@1234';
            const genderStr = normalizedRow.gender || 'Male';

            const rowErrors = [];
            const fieldErrors = {};

            if (!name) fieldErrors.name = 'Missing name';
            if (!email) fieldErrors.email = 'Missing email';
            if (!entityStr && !entityCodeStr) fieldErrors.entity = 'Missing entity or code';

            if (!email || !name || (!entityStr && !entityCodeStr)) {
                if (Object.keys(normalizedRow).length > 0) {
                    rowErrors.push(`Missing required fields (Name, Email, Entity/Entity Code)`);
                } else {
                    continue; // Skip completely empty rows
                }
            }

            let entityObj = null;
            if (entityCodeStr) entityObj = entityMap[entityCodeStr.toLowerCase()];
            if (!entityObj && entityStr) entityObj = entityMap[entityStr.toLowerCase()];

            if (!entityObj && (entityStr || entityCodeStr)) {
                rowErrors.push(`Entity code/name '${entityCodeStr || entityStr}' not present in system`);
                fieldErrors.entity = 'Entity not found';
            }

            let categoryObj = null;
            if (categoryStr) {
                categoryObj = categoryMap[categoryStr.toLowerCase()];
                if (!categoryObj) {
                    rowErrors.push(`Employee category '${categoryStr}' not present in system`);
                    fieldErrors.category = 'Category not found';
                }
            }

            let levelObj = null;
            if (levelStr) {
                if (entityObj) {
                    let key = `${levelStr.toLowerCase()}_${entityObj._id.toString()}`;
                    levelObj = impactLevelMap[key] || impactLevelMap[levelStr.toLowerCase()];
                } else {
                    levelObj = impactLevelMap[levelStr.toLowerCase()];
                }
                if (!levelObj) {
                    rowErrors.push(`Impact level '${levelStr}' not present in system`);
                    fieldErrors.level = 'Level not found';
                }
            }

            const isValid = rowErrors.length === 0;
            if (isValid) validCount++;

            validationResults.push({
                rowNumber: i + 1,
                originalData: { name, email, role, entityStr, levelStr, categoryStr, status, entityCodeStr, password, genderStr },
                parsedData: isValid ? {
                    name, email, password, role, entityId: entityObj._id, levelId: levelObj?._id || null, status,
                    entityCode: entityCodeStr || entityObj.entityCode, categoryId: categoryObj?._id || null, gender: genderStr
                } : null,
                errors: rowErrors,
                fieldErrors: fieldErrors,
                isValid
            });
        }


        res.status(200).json({
            success: true,
            data: {
                results: validationResults,
                stats: { total: validationResults.length, valid: validCount, invalid: validationResults.length - validCount }
            }
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) try { fs.unlinkSync(req.file.path); } catch (e) { }
        next(error);
    }

};

// @desc    Bulk create employees from validated preview data
// @route   POST /api/admin/bulk-upload-employees
// @access  Private/Admin
const bulkCreateEmployees = async (req, res, next) => {
    try {
        const { employees } = req.body;
        if (!employees || !Array.isArray(employees)) {
            return res.status(400).json({ success: false, message: 'Invalid employee data' });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const emp of employees) {
            try {
                await authService.registerUser(
                    emp.name, emp.email, emp.password, emp.role,
                    emp.entityId, emp.levelId, emp.status,
                    emp.entityCode, emp.categoryId, true, emp.gender
                );
                successCount++;
            } catch (err) {
                errorCount++;
                errors.push(`Error creating ${emp.email || 'user'}: ${err.message}`);
            }
        }

        res.status(200).json({
            success: true,
            message: `Processed ${employees.length} records. Created: ${successCount}. Failed: ${errorCount}`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        next(error);
    }
};

// ── HROps Management ──────────────────────────────────────────────────────

// GET /api/admin/hrops
const getHrOpsAssignments = async (req, res, next) => {
    try {
        const themes = await QuestionTheme.find({ isPredefined: true }).sort({ name: 1 }).lean();
        const hrOpsUsers = await User.find({ roles: 'hrOps' })
            .select('name email status assignedThemes roles')
            .lean();

        // Dropdown only shows existing hrOps users (not all employees)
        const hrOpsEmployees = hrOpsUsers
            .map(u => ({ _id: u._id, name: u.name, email: u.email, status: u.status }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const result = themes.map(theme => ({
            ...theme,
            hrOpsUsers: hrOpsUsers
                .filter(u => u.assignedThemes.some(t => t.toString() === theme._id.toString()))
                .map(u => ({ _id: u._id, name: u.name, email: u.email, status: u.status })),
        }));

        res.status(200).json({ statusCode: 200, success: true, data: result, employees: hrOpsEmployees });
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/hrops/assign  { themeId, userId }
const assignHrOps = async (req, res, next) => {
    try {
        const { themeId, userId } = req.body;
        if (!themeId || !userId) { res.status(400); throw new Error('themeId and userId are required'); }

        const user = await User.findById(userId);
        if (!user) { res.status(404); throw new Error('User not found'); }

        // HROps cannot be admin
        if (user.roles.includes('admin') || user.roles.includes('superAdmin')) {
            res.status(400); throw new Error('Admin users cannot be assigned as HROps');
        }

        // Enforce one HROps per category: remove any existing HROps from this theme first
        const existing = await User.find({ roles: 'hrOps', assignedThemes: themeId });
        for (const prev of existing) {
            if (prev._id.toString() !== userId) {
                prev.assignedThemes = prev.assignedThemes.filter(t => t.toString() !== themeId);
                await prev.save();
            }
        }

        if (!user.roles.includes('hrOps')) user.roles.push('hrOps');
        if (!user.assignedThemes.map(t => t.toString()).includes(themeId)) {
            user.assignedThemes.push(themeId);
        }
        await user.save();

        res.status(200).json({ statusCode: 200, success: true, message: 'HROps assigned successfully' });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/hrops/unassign  { themeId, userId }
const unassignHrOps = async (req, res, next) => {
    try {
        const { themeId, userId } = req.body;
        if (!themeId || !userId) { res.status(400); throw new Error('themeId and userId are required'); }

        const user = await User.findById(userId);
        if (!user) { res.status(404); throw new Error('User not found'); }

        user.assignedThemes = user.assignedThemes.filter(t => t.toString() !== themeId);
        await user.save();

        res.status(200).json({ statusCode: 200, success: true, message: 'HROps unassigned successfully' });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/admin/hrops/status  { userId, status }
const toggleHrOpsUserStatus = async (req, res, next) => {
    try {
        const { userId, status } = req.body;
        if (!userId || !['active', 'inactive'].includes(status)) {
            res.status(400); throw new Error('userId and valid status (active/inactive) required');
        }
        const user = await User.findByIdAndUpdate(userId, { status }, { new: true }).select('name email status');
        if (!user) { res.status(404); throw new Error('User not found'); }
        res.status(200).json({ statusCode: 200, success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/admin/hrops/closure  { themeId, daysToClosure }
const updateThemeClosure = async (req, res, next) => {
    try {
        const { themeId, daysToClosure } = req.body;
        if (!themeId) { res.status(400); throw new Error('themeId is required'); }

        const value = daysToClosure === null || daysToClosure === '' || daysToClosure === undefined
            ? null
            : Number(daysToClosure);

        if (value !== null && (!Number.isInteger(value) || value < 1)) {
            res.status(400); throw new Error('daysToClosure must be a positive integer or null');
        }

        const theme = await QuestionTheme.findByIdAndUpdate(
            themeId,
            { daysToClosure: value },
            { new: true }
        );
        if (!theme) { res.status(404); throw new Error('Theme not found'); }

        res.status(200).json({ statusCode: 200, success: true, data: theme });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Global Ticket Stats (Admin)
// @route   GET /api/admin/tickets/stats
// @access  Private/Admin
const getGlobalTicketStats = async (req, res, next) => {
    try {
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const getStatsForDate = async (targetDate) => {
            const tickets = await Ticket.find({ createdAt: { $lte: targetDate } })
                .populate('theme', 'daysToClosure').lean();

            const total = tickets.length;
            const activeCount = tickets.filter(t => ['open', 'hold'].includes(t.status)).length;
            const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
            const resRate = total > 0 ? (resolvedCount / total) * 100 : 0;

            let slaFailures = 0;
            let backlog = 0;

            tickets.forEach(t => {
                const slaDays = t.theme?.daysToClosure || 2;
                const slaMs = slaDays * 24 * 60 * 60 * 1000;
                const isOverdue = (targetDate - new Date(t.createdAt)) > slaMs;

                if (isOverdue) {
                    if (t.status !== 'resolved') {
                        backlog++;
                    } else if (new Date(t.updatedAt) - new Date(t.createdAt) > slaMs) {
                        slaFailures++;
                    }
                }
            });

            return { total, activeCount, resRate, slaFailures, backlog };
        };

        const current = await getStatsForDate(now);
        const previous = await getStatsForDate(lastWeek);

        const calculateChange = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        const data = {
            totalTickets: {
                value: current.total,
                change: calculateChange(current.total, previous.total)
            },
            activeTickets: {
                value: current.activeCount,
                change: calculateChange(current.activeCount, previous.activeCount)
            },
            resolutionRate: {
                value: current.resRate.toFixed(1) + '%',
                change: calculateChange(current.resRate, previous.resRate)
            },
            slaCompliance: {
                value: current.slaFailures,
                change: calculateChange(current.slaFailures, previous.slaFailures)
            },
            backlog: {
                value: current.backlog,
                change: calculateChange(current.backlog, previous.backlog)
            }
        };

        res.status(200).json({ statusCode: 200, success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Global Tickets with filters (Admin)
// @route   GET /api/admin/tickets
// @access  Private/Admin
const getGlobalTickets = async (req, res, next) => {
    try {
        const { status, theme, hropsId, page = 1, limit = 10, search, ticketNumber, startDate, endDate } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (ticketNumber) filter.ticketNumber = { $regex: ticketNumber, $options: 'i' };

        // Date range
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(`${startDate}T00:00:00`);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
            }
        }

        // Search in employee name, subject or description
        if (search) {
            const matchingUsers = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
            const userIds = matchingUsers.map(u => u._id);
            
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { userId: { $in: userIds } },
                    { description: { $regex: search, $options: 'i' } },
                    { subject: { $regex: search, $options: 'i' } },
                    { ticketNumber: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // If filtering by HROps user, resolve their assigned themes
        if (hropsId) {
            const hropsUser = await User.findById(hropsId).select('assignedThemes').lean();
            if (hropsUser && hropsUser.assignedThemes?.length > 0) {
                const hropsThemes = hropsUser.assignedThemes.map(id => id.toString());
                if (theme) {
                    filter.theme = theme;
                } else {
                    filter.theme = { $in: hropsThemes };
                }
            } else {
                return res.status(200).json({ statusCode: 200, success: true, data: [], total: 0, page: 1, pages: 0 });
            }
        } else if (theme) {
            filter.theme = theme;
        }

        const [tickets, total, allHrOpsUsers] = await Promise.all([
            Ticket.find(filter)
                .populate('userId', 'name email')
                .populate('theme', 'daysToClosure name')
                .sort({ createdAt: -1 })
                .skip((page - 1) * Number(limit))
                .limit(Number(limit))
                .lean(),
            Ticket.countDocuments(filter),
            User.find({ roles: 'hrOps' }).select('name email assignedThemes').lean(),
        ]);

        // Build theme → hrOps user map for fast lookup
        const themeToHrOps = {};
        allHrOpsUsers.forEach(u => {
            u.assignedThemes.forEach(themeId => {
                themeToHrOps[themeId.toString()] = { _id: u._id, name: u.name, email: u.email };
            });
        });

        // Attach hrOpsPoc to every ticket
        const enriched = tickets.map(t => ({
            ...t,
            hrOpsPoc: themeToHrOps[t.theme?._id?.toString()] || null,
        }));

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: enriched,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Export Global Tickets to CSV (Admin)
// @route   GET /api/admin/tickets/export
// @access  Private/Admin
const exportGlobalTickets = async (req, res, next) => {
    try {
        const { status, theme, hropsId, search, startDate, endDate } = req.query;
        const filter = {};

        if (status) filter.status = status;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(`${startDate}T00:00:00`);
            if (endDate) filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
        }

        if (search) {
            const matchingUsers = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
            const userIds = matchingUsers.map(u => u._id);
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { userId: { $in: userIds } },
                    { description: { $regex: search, $options: 'i' } },
                    { subject: { $regex: search, $options: 'i' } },
                    { ticketNumber: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (hropsId) {
            const hropsUser = await User.findById(hropsId).select('assignedThemes').lean();
            if (hropsUser && hropsUser.assignedThemes?.length > 0) {
                const hropsThemes = hropsUser.assignedThemes.map(id => id.toString());
                if (theme) {
                    filter.theme = theme;
                } else {
                    filter.theme = { $in: hropsThemes };
                }
            } else {
                return res.status(200).send('Ticket ID,Raised By,Email,Category,Assigned To (HR POC),Subject,Description,Status,Created At\n');
            }
        } else if (theme) {
            filter.theme = theme;
        }

        const [tickets, allHrOpsUsers] = await Promise.all([
            Ticket.find(filter)
                .populate('userId', 'name email')
                .populate('theme', 'name')
                .sort({ createdAt: -1 })
                .lean(),
            User.find({ roles: 'hrOps' }).select('name assignedThemes').lean(),
        ]);

        const themeToHrOps = {};
        allHrOpsUsers.forEach(u => {
            u.assignedThemes.forEach(tId => { themeToHrOps[tId.toString()] = u.name; });
        });

        const csvData = tickets.map(t => ({
            'Ticket ID': t.ticketNumber,
            'Raised By': t.userId?.name || 'N/A',
            'Email': t.userId?.email || 'N/A',
            'Category': t.theme?.name || 'N/A',
            'Assigned To (HR POC)': themeToHrOps[t.theme?._id?.toString()] || 'Unassigned',
            'Subject': t.subject || 'N/A',
            'Description': (t.description || t.userQuestion || 'N/A').replace(/,/g, ';').replace(/\n/g, ' '),
            'Status': t.status,
            'Created At': new Date(t.createdAt).toLocaleString()
        }));

        const ws = XLSX.utils.json_to_sheet(csvData);
        const csvContent = XLSX.utils.sheet_to_csv(ws);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=tickets_export_${Date.now()}.csv`);
        res.status(200).send(csvContent);
    } catch (error) {
        next(error);
    }
};

export {
    getDashboardStats,
    getUsers,
    updateUser,
    deleteUser,
    getInteractions,
    getEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    downloadEmployeeTemplate,
    previewEmployeesCsv,
    bulkCreateEmployees,
    getPolicies,
    uploadPolicy,
    getLogs,
    createChunks,
    deletePolicy,
    updatePolicy,
    publishPolicy,
    getArchivedPolicies,
    generatePolicyFaqs,
    getHrOpsAssignments,
    assignHrOps,
    unassignHrOps,
    toggleHrOpsUserStatus,
    updateThemeClosure,
    getGlobalTicketStats,
    getGlobalTickets,
    exportGlobalTickets
};
