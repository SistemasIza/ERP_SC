// Data validation functions

export const validateRequired = (value: any, fieldName: string): void => {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
};

export const validateEmail = (email: string, fieldName: string = 'Email'): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`${fieldName} must be a valid email address`);
  }
};

export const validatePhoneNumber = (phone: string, fieldName: string = 'Phone number'): void => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error(`${fieldName} must be a valid phone number`);
  }
};

export const validateLength = (value: string, min: number, max: number, fieldName: string): void => {
  if (value.length < min || value.length > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max} characters`);
  }
};

export const validateMin = (value: number, min: number, fieldName: string): void => {
  if (value < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }
};

export const validateMax = (value: number, max: number, fieldName: string): void => {
  if (value > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }
};

export const validateRange = (value: number, min: number, max: number, fieldName: string): void => {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
};

export const validateEnum = (value: string, allowedValues: string[], fieldName: string): void => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
};

export const validateUrl = (url: string, fieldName: string = 'URL'): void => {
  try {
    new URL(url);
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }
};

export const validateUuid = (uuid: string, fieldName: string = 'ID'): void => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
};

export const validateDate = (date: any, fieldName: string = 'Date'): void => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
};

export const validateFutureDate = (date: any, fieldName: string = 'Date'): void => {
  const d = new Date(date);
  if (isNaN(d.getTime()) || d <= new Date()) {
    throw new Error(`${fieldName} must be a future date`);
  }
};

export const validatePastDate = (date: any, fieldName: string = 'Date'): void => {
  const d = new Date(date);
  if (isNaN(d.getTime()) || d >= new Date()) {
    throw new Error(`${fieldName} must be a past date`);
  }
};

export const validatePositiveNumber = (value: number, fieldName: string): void => {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
};

export const validateNonNegativeNumber = (value: number, fieldName: string): void => {
  if (typeof value !== 'number' || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
};

export const validateInteger = (value: number, fieldName: string): void => {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
};

export const validateArray = (value: any, fieldName: string): void => {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
};

export const validateObject = (value: any, fieldName: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
};

export const validateBoolean = (value: any, fieldName: string): void => {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
};

export const validateString = (value: any, fieldName: string): void => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
};

export const validateNumber = (value: any, fieldName: string): void => {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
};

export const validatePattern = (value: string, pattern: RegExp, fieldName: string, errorMessage?: string): void => {
  if (!pattern.test(value)) {
    throw new Error(errorMessage || `${fieldName} format is invalid`);
  }
};

export const validateMinLength = (value: string, min: number, fieldName: string): void => {
  if (value.length < min) {
    throw new Error(`${fieldName} must be at least ${min} characters`);
  }
};

export const validateMaxLength = (value: string, max: number, fieldName: string): void => {
  if (value.length > max) {
    throw new Error(`${fieldName} must be at most ${max} characters`);
  }
};

export const validateMinArrayLength = (value: any[], min: number, fieldName: string): void => {
  if (value.length < min) {
    throw new Error(`${fieldName} must have at least ${min} items`);
  }
};

export const validateMaxArrayLength = (value: any[], max: number, fieldName: string): void => {
  if (value.length > max) {
    throw new Error(`${fieldName} must have at most ${max} items`);
  }
};

export const validateUnique = (value: any[], fieldName: string): void => {
  const unique = new Set(value);
  if (unique.size !== value.length) {
    throw new Error(`${fieldName} must contain unique values`);
  }
};

export const validateContains = (value: string, substring: string, fieldName: string): void => {
  if (!value.includes(substring)) {
    throw new Error(`${fieldName} must contain "${substring}"`);
  }
};

export const validateStartsWith = (value: string, prefix: string, fieldName: string): void => {
  if (!value.startsWith(prefix)) {
    throw new Error(`${fieldName} must start with "${prefix}"`);
  }
};

export const validateEndsWith = (value: string, suffix: string, fieldName: string): void => {
  if (!value.endsWith(suffix)) {
    throw new Error(`${fieldName} must end with "${suffix}"`);
  }
};

export const validateMatches = (value: string, pattern: string, fieldName: string): void => {
  if (value !== pattern) {
    throw new Error(`${fieldName} must match "${pattern}"`);
  }
};

export const validateOneOf = (value: any, allowedValues: any[], fieldName: string): void => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
};

export const validateNoneOf = (value: any, disallowedValues: any[], fieldName: string): void => {
  if (disallowedValues.includes(value)) {
    throw new Error(`${fieldName} cannot be one of: ${disallowedValues.join(', ')}`);
  }
};

export const validateCustom = (value: any, validator: (value: any) => boolean, errorMessage: string): void => {
  if (!validator(value)) {
    throw new Error(errorMessage);
  }
};

// Validation schema builder
export class ValidationSchema {
  private rules: Map<string, ((value: any) => void)[]> = new Map();

  addRule(fieldName: string, rule: (value: any) => void): this {
    if (!this.rules.has(fieldName)) {
      this.rules.set(fieldName, []);
    }
    this.rules.get(fieldName)!.push(rule);
    return this;
  }

  required(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateRequired(value, fieldName));
  }

  email(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateEmail(value, fieldName));
  }

  phone(fieldName: string): this {
    return this.addRule(fieldName, (value) => validatePhoneNumber(value, fieldName));
  }

  min(fieldName: string, min: number): this {
    return this.addRule(fieldName, (value) => validateMin(value, min, fieldName));
  }

  max(fieldName: string, max: number): this {
    return this.addRule(fieldName, (value) => validateMax(value, max, fieldName));
  }

  length(fieldName: string, min: number, max: number): this {
    return this.addRule(fieldName, (value) => validateLength(value, min, max, fieldName));
  }

  enum(fieldName: string, allowedValues: string[]): this {
    return this.addRule(fieldName, (value) => validateEnum(value, allowedValues, fieldName));
  }

  url(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateUrl(value, fieldName));
  }

  uuid(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateUuid(value, fieldName));
  }

  date(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateDate(value, fieldName));
  }

  positive(fieldName: string): this {
    return this.addRule(fieldName, (value) => validatePositiveNumber(value, fieldName));
  }

  integer(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateInteger(value, fieldName));
  }

  array(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateArray(value, fieldName));
  }

  object(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateObject(value, fieldName));
  }

  boolean(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateBoolean(value, fieldName));
  }

  string(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateString(value, fieldName));
  }

  number(fieldName: string): this {
    return this.addRule(fieldName, (value) => validateNumber(value, fieldName));
  }

  pattern(fieldName: string, pattern: RegExp, errorMessage?: string): this {
    return this.addRule(fieldName, (value) => validatePattern(value, pattern, fieldName, errorMessage));
  }

  minLength(fieldName: string, min: number): this {
    return this.addRule(fieldName, (value) => validateMinLength(value, min, fieldName));
  }

  maxLength(fieldName: string, max: number): this {
    return this.addRule(fieldName, (value) => validateMaxLength(value, max, fieldName));
  }

  custom(fieldName: string, validator: (value: any) => boolean, errorMessage: string): this {
    return this.addRule(fieldName, (value) => validateCustom(value, validator, errorMessage));
  }

  validate(data: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    for (const [fieldName, rules] of this.rules.entries()) {
      const value = data[fieldName];
      
      for (const rule of rules) {
        try {
          rule(value);
        } catch (error: any) {
          errors[fieldName] = error.message;
          break; // Stop at first error for this field
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Pre-built schemas for common use cases
export const userSchema = new ValidationSchema()
  .required('email')
  .email('email')
  .required('name')
  .string('name')
  .minLength('name', 2)
  .maxLength('name', 100);

export const conversationSchema = new ValidationSchema()
  .required('contact_id')
  .uuid('contact_id')
  .required('organization_id')
  .uuid('organization_id');

export const messageSchema = new ValidationSchema()
  .required('conversation_id')
  .uuid('conversation_id')
  .required('contact_id')
  .uuid('contact_id')
  .required('content')
  .string('content');

export const platformConnectionSchema = new ValidationSchema()
  .required('platform_type')
  .enum('platform_type', ['whatsapp', 'telegram', 'instagram', 'tiktok', 'facebook_messenger', 'mercadolibre'])
  .required('display_name')
  .string('display_name')
  .minLength('display_name', 2)
  .maxLength('display_name', 100);
