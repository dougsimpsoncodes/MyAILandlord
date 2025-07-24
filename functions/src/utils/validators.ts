import * as Joi from 'joi';

export const validateCase = (data: any) => {
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

export const validateUserUpdate = (data: any) => {
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