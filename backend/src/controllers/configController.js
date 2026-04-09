import Entity from '../models/Entity.js';
import ImpactLevel from '../models/ImpactLevel.js';
import EmployeeCategory from '../models/EmployeeCategory.js';
import PolicyCategory from '../models/PolicyCategory.js';
import QuestionTheme from '../models/QuestionTheme.js';

// ─── Helper ─────────────────────────────────────────────────────────────────
const adminName = (req) => req.user?.name || 'Admin';

// ════════════════════════════════════════════════════════════════════════════
//  ENTITY  (Config variant – keeps entityCode)
// ════════════════════════════════════════════════════════════════════════════

// @desc    Get all entities (config)
// @route   GET /api/admin/config/entities
// @access  Private/Admin
const getConfigEntities = async (req, res, next) => {
    try {
        const entities = await Entity.find().sort({ createdAt: -1 });
        res.json({ success: true, data: entities });
    } catch (error) {
        next(error);
    }
};

// @desc    Create entity (config)
// @route   POST /api/admin/config/entities
// @access  Private/Admin
const createConfigEntity = async (req, res, next) => {
    try {
        const { name, entityCode } = req.body;
        if (!name || !entityCode) {
            res.status(400);
            throw new Error('Name and entity code are required');
        }
        const entity = await Entity.create({
            name: name.trim(),
            entityCode: entityCode.trim().toUpperCase(),
            createdBy: adminName(req)
        });
        res.status(201).json({ success: true, data: entity });
    } catch (error) {
        next(error);
    }
};

// @desc    Update entity (config)
// @route   PUT /api/admin/config/entities/:id
// @access  Private/Admin
const updateConfigEntity = async (req, res, next) => {
    try {
        const { name, entityCode } = req.body;
        const entity = await Entity.findById(req.params.id);
        if (!entity) { res.status(404); throw new Error('Entity not found'); }

        if (name) entity.name = name.trim();
        if (entityCode) entity.entityCode = entityCode.trim().toUpperCase();
        const updated = await entity.save();
        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete entity (config)
// @route   DELETE /api/admin/config/entities/:id
// @access  Private/Admin
const deleteConfigEntity = async (req, res, next) => {
    try {
        const entity = await Entity.findById(req.params.id);
        if (!entity) { res.status(404); throw new Error('Entity not found'); }

        // Also remove all impact levels linked to this entity
        await ImpactLevel.deleteMany({ entity: entity._id });
        await entity.deleteOne();
        res.json({ success: true, message: 'Entity and its impact levels deleted' });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  IMPACT LEVEL (entity-scoped)
// ════════════════════════════════════════════════════════════════════════════

// @desc    Get all impact levels (optionally filtered by entity)
// @route   GET /api/admin/config/impact-levels?entity=<id>
// @access  Private/Admin
const getImpactLevels = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.entity) filter.entity = req.query.entity;
        const levels = await ImpactLevel.find(filter)
            .populate('entity', 'name entityCode')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: levels });
    } catch (error) {
        next(error);
    }
};

// @desc    Create impact level
// @route   POST /api/admin/config/impact-levels
// @access  Private/Admin
const createImpactLevel = async (req, res, next) => {
    try {
        const { name, entity } = req.body;
        if (!name || !entity) {
            res.status(400);
            throw new Error('Name and entity are required');
        }
        const level = await ImpactLevel.create({
            name: name.trim(),
            entity,
            createdBy: adminName(req)
        });
        const populated = await level.populate('entity', 'name entityCode');
        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        next(error);
    }
};

// @desc    Update impact level
// @route   PUT /api/admin/config/impact-levels/:id
// @access  Private/Admin
const updateImpactLevel = async (req, res, next) => {
    try {
        const { name, entity } = req.body;
        const level = await ImpactLevel.findById(req.params.id);
        if (!level) { res.status(404); throw new Error('Impact level not found'); }

        if (name) level.name = name.trim();
        if (entity) level.entity = entity;
        const updated = await level.save();
        const populated = await updated.populate('entity', 'name entityCode');
        res.json({ success: true, data: populated });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete impact level
// @route   DELETE /api/admin/config/impact-levels/:id
// @access  Private/Admin
const deleteImpactLevel = async (req, res, next) => {
    try {
        const level = await ImpactLevel.findById(req.params.id);
        if (!level) { res.status(404); throw new Error('Impact level not found'); }
        await level.deleteOne();
        res.json({ success: true, message: 'Impact level deleted' });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE CATEGORY
// ════════════════════════════════════════════════════════════════════════════

// @desc    Get all employee categories
// @route   GET /api/admin/config/employee-categories
// @access  Private/Admin
const getEmployeeCategories = async (req, res, next) => {
    try {
        const cats = await EmployeeCategory.find().sort({ createdAt: -1 });
        res.json({ success: true, data: cats });
    } catch (error) {
        next(error);
    }
};

// @desc    Create employee category
// @route   POST /api/admin/config/employee-categories
// @access  Private/Admin
const createEmployeeCategory = async (req, res, next) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) { res.status(400); throw new Error('Name and code are required'); }
        const cat = await EmployeeCategory.create({ name: name.trim(), code: code.trim().toUpperCase(), createdBy: adminName(req) });
        res.status(201).json({ success: true, data: cat });
    } catch (error) {
        next(error);
    }
};

// @desc    Update employee category
// @route   PUT /api/admin/config/employee-categories/:id
// @access  Private/Admin
const updateEmployeeCategory = async (req, res, next) => {
    try {
        const { name, code } = req.body;
        const cat = await EmployeeCategory.findById(req.params.id);
        if (!cat) { res.status(404); throw new Error('Employee category not found'); }
        if (name) cat.name = name.trim();
        if (code) cat.code = code.trim().toUpperCase();
        const updated = await cat.save();
        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete employee category
// @route   DELETE /api/admin/config/employee-categories/:id
// @access  Private/Admin
const deleteEmployeeCategory = async (req, res, next) => {
    try {
        const cat = await EmployeeCategory.findById(req.params.id);
        if (!cat) { res.status(404); throw new Error('Employee category not found'); }
        await cat.deleteOne();
        res.json({ success: true, message: 'Employee category deleted' });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  POLICY CATEGORY
// ════════════════════════════════════════════════════════════════════════════

// @desc    Get all policy categories
// @route   GET /api/admin/config/policy-categories
// @access  Private/Admin
const getPolicyCategories = async (req, res, next) => {
    try {
        const cats = await PolicyCategory.find().sort({ createdAt: -1 });
        res.json({ success: true, data: cats });
    } catch (error) {
        next(error);
    }
};

// @desc    Create policy category
// @route   POST /api/admin/config/policy-categories
// @access  Private/Admin
const createPolicyCategory = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) { res.status(400); throw new Error('Name is required'); }
        const cat = await PolicyCategory.create({ name: name.trim(), createdBy: adminName(req) });
        res.status(201).json({ success: true, data: cat });
    } catch (error) {
        next(error);
    }
};

// @desc    Update policy category
// @route   PUT /api/admin/config/policy-categories/:id
// @access  Private/Admin
const updatePolicyCategory = async (req, res, next) => {
    try {
        const { name } = req.body;
        const cat = await PolicyCategory.findById(req.params.id);
        if (!cat) { res.status(404); throw new Error('Policy category not found'); }
        if (name) cat.name = name.trim();
        const updated = await cat.save();
        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete policy category
// @route   DELETE /api/admin/config/policy-categories/:id
// @access  Private/Admin
const deletePolicyCategory = async (req, res, next) => {
    try {
        const cat = await PolicyCategory.findById(req.params.id);
        if (!cat) { res.status(404); throw new Error('Policy category not found'); }
        await cat.deleteOne();
        res.json({ success: true, message: 'Policy category deleted' });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  QUESTION THEMES (predefined, read-only for admins)
// ════════════════════════════════════════════════════════════════════════════

// @desc    Get all predefined question themes
// @route   GET /api/admin/config/question-themes
// @access  Private/Admin
const getQuestionThemes = async (req, res, next) => {
    try {
        const themes = await QuestionTheme.find({ isPredefined: true })
            .select('_id name description')
            .sort({ name: 1 })
            .lean();
        res.json({ success: true, data: themes });
    } catch (error) {
        next(error);
    }
};

export {
    // Entity
    getConfigEntities,
    createConfigEntity,
    updateConfigEntity,
    deleteConfigEntity,
    // Impact Level
    getImpactLevels,
    createImpactLevel,
    updateImpactLevel,
    deleteImpactLevel,
    // Employee Category
    getEmployeeCategories,
    createEmployeeCategory,
    updateEmployeeCategory,
    deleteEmployeeCategory,
    // Policy Category
    getPolicyCategories,
    createPolicyCategory,
    updatePolicyCategory,
    deletePolicyCategory,
    // Question Themes
    getQuestionThemes,
};
