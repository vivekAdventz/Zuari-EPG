import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    getDashboardStats,
    getUsers,
    updateUser,
    deleteUser,
    getInteractions,
    getEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    getPolicies,
    uploadPolicy,
    getLogs,
    createChunks,
    deletePolicy,
    updatePolicy,
    publishPolicy,
    downloadEmployeeTemplate,
    previewEmployeesCsv,
    bulkCreateEmployees,
    getArchivedPolicies,
    generatePolicyFaqs,
    getHrOpsAssignments,
    assignHrOps,
    unassignHrOps,
    toggleHrOpsUserStatus,
    updateThemeClosure,
    getGlobalTicketStats,
    getGlobalTickets,
    exportGlobalTickets,
} from '../controllers/adminController.js';

import { handlePlaygroundChat, handlePlaygroundReset } from '../controllers/playground/playgroundController.js';
import {
    getConfigEntities, createConfigEntity, updateConfigEntity, deleteConfigEntity,
    getImpactLevels, createImpactLevel, updateImpactLevel, deleteImpactLevel,
    getEmployeeCategories, createEmployeeCategory, updateEmployeeCategory, deleteEmployeeCategory,
    getPolicyCategories, createPolicyCategory, updatePolicyCategory, deletePolicyCategory,
    getQuestionThemes,
} from '../controllers/configController.js';
import { getQueryFeedbacks, getUserFeedbacks } from '../controllers/feedbackController.js';
import { protect } from '../middleware/authMiddleware.js';

// Admin middleware to ensure user is admin
const admin = (req, res, next) => {
    if (req.user && (req.user.roles?.includes('admin') || req.user.roles?.includes('superAdmin'))) {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/policies/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Policies Only (PDF, DOC, DOCX)!');
        }
    }
});

// Configure Multer for CSV/Excel uploads
const storageCsv = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadCsv = multer({
    storage: storageCsv,
    fileFilter: function (req, file, cb) {
        const filetypes = /csv|xlsx|xls/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (extname) {
            return cb(null, true);
        } else {
            cb('Error: CSV or Excel Files Only!');
        }
    }
});

const router = express.Router();

// Dashboard Stats
router.get('/dashboard-stats', protect, admin, getDashboardStats);

// User Management
router.get('/users', protect, admin, getUsers);
router.get('/download-template', protect, admin, downloadEmployeeTemplate);
router.post('/preview-employees-csv', protect, admin, uploadCsv.single('file'), previewEmployeesCsv);
router.post('/bulk-upload-employees', protect, admin, bulkCreateEmployees);
router.put('/users/:id', protect, admin, updateUser);
router.delete('/users/:id', protect, admin, deleteUser);

// Interaction Monitoring
router.get('/interactions', protect, admin, getInteractions);

// Entity Management
router.route('/entities')
    .get(protect, admin, getEntities)
    .post(protect, admin, createEntity);

router.put('/entities/:id', protect, admin, updateEntity);
router.delete('/entities/:id', protect, admin, deleteEntity);

// Policy Management
router.get('/policies/archived', protect, admin, getArchivedPolicies);
router.get('/policies', protect, admin, getPolicies);
router.post('/upload-policy', protect, admin, upload.single('policyDocument'), uploadPolicy);
router.put('/policies/:id', protect, admin, upload.single('policyDocument'), updatePolicy);
router.post('/policies/:id/chunk', protect, admin, createChunks);
router.post('/policies/:id/publish', protect, admin, publishPolicy);
router.post('/policies/:id/faqs/generate', protect, admin, generatePolicyFaqs);
router.delete('/policies/:id', protect, admin, deletePolicy);

// Logs
router.get('/logs', protect, admin, getLogs);

// Playground Chat
router.post('/playground/chat', protect, admin, handlePlaygroundChat);
router.post('/playground/chat/reset', protect, admin, handlePlaygroundReset);

// ── Config Routes ──────────────────────────────────────────────────────────
// Entities
router.route('/config/entities')
    .get(protect, admin, getConfigEntities)
    .post(protect, admin, createConfigEntity);
router.route('/config/entities/:id')
    .put(protect, admin, updateConfigEntity)
    .delete(protect, admin, deleteConfigEntity);

// Impact Levels
router.route('/config/impact-levels')
    .get(protect, admin, getImpactLevels)
    .post(protect, admin, createImpactLevel);
router.route('/config/impact-levels/:id')
    .put(protect, admin, updateImpactLevel)
    .delete(protect, admin, deleteImpactLevel);

// Employee Categories
router.route('/config/employee-categories')
    .get(protect, admin, getEmployeeCategories)
    .post(protect, admin, createEmployeeCategory);
router.route('/config/employee-categories/:id')
    .put(protect, admin, updateEmployeeCategory)
    .delete(protect, admin, deleteEmployeeCategory);

// Policy Categories
router.route('/config/policy-categories')
    .get(protect, admin, getPolicyCategories)
    .post(protect, admin, createPolicyCategory);
router.route('/config/policy-categories/:id')
    .put(protect, admin, updatePolicyCategory)
    .delete(protect, admin, deletePolicyCategory);

// Question Themes
router.get('/config/question-themes', protect, admin, getQuestionThemes);

// HROps Management
router.get('/hrops', protect, admin, getHrOpsAssignments);
router.post('/hrops/assign', protect, admin, assignHrOps);
router.delete('/hrops/unassign', protect, admin, unassignHrOps);
router.patch('/hrops/status', protect, admin, toggleHrOpsUserStatus);
router.patch('/hrops/closure', protect, admin, updateThemeClosure);

// Feedback
router.get('/feedbacks/queries', protect, admin, getQueryFeedbacks);
router.get('/feedbacks/users', protect, admin, getUserFeedbacks);

// Ticket Monitor (Admin View)
router.get('/tickets/stats', protect, admin, getGlobalTicketStats);
router.get('/tickets/export', protect, admin, exportGlobalTickets);
router.get('/tickets', protect, admin, getGlobalTickets);

export default router;
// Force reload
