"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUserUpdate = exports.validateCase = void 0;
const Joi = __importStar(require("joi"));
const validateCase = (data) => {
    const schema = Joi.object({
        title: Joi.string().required().min(3).max(100),
        description: Joi.string().required().min(10).max(1000),
        category: Joi.string().valid('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'other').required(),
        priority: Joi.string().valid('low', 'medium', 'high', 'emergency').required(),
        propertyAddress: Joi.string().required(),
        unitNumber: Joi.string().optional(),
        location: Joi.string().optional(),
        images: Joi.array().items(Joi.string()).optional(),
        voiceNote: Joi.string().optional()
    });
    return schema.validate(data);
};
exports.validateCase = validateCase;
const validateUserUpdate = (data) => {
    const schema = Joi.object({
        displayName: Joi.string().min(2).max(50).optional(),
        photoURL: Joi.string().uri().optional(),
        propertyAddress: Joi.string().optional(),
        unitNumber: Joi.string().optional(),
        properties: Joi.array().optional(),
        vendorContacts: Joi.array().optional()
    });
    return schema.validate(data);
};
exports.validateUserUpdate = validateUserUpdate;
//# sourceMappingURL=validators.js.map