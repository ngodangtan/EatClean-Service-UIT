import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, updateProfileSchema } from '../../../src/validators/auth.validator.js';

describe('registerSchema', () => {
  const base = { email: 'test@example.com', password: 'Secure1!' };

  it('accepts a valid registration', () => {
    const { error } = registerSchema.validate(base);
    expect(error).toBeUndefined();
  });

  it('rejects password shorter than 8 characters', () => {
    const { error } = registerSchema.validate({ ...base, password: 'Ab1' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/8/);
  });

  it('rejects password with no uppercase letter', () => {
    const { error } = registerSchema.validate({ ...base, password: 'alllower1' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/uppercase/i);
  });

  it('rejects password with no lowercase letter', () => {
    const { error } = registerSchema.validate({ ...base, password: 'ALLUPPER1' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/lowercase/i);
  });

  it('rejects password with no digit', () => {
    const { error } = registerSchema.validate({ ...base, password: 'NoDigitsHere' });
    expect(error).toBeDefined();
    expect(error.message).toMatch(/number/i);
  });

  it('rejects missing email', () => {
    const { error } = registerSchema.validate({ password: 'Secure1!' });
    expect(error).toBeDefined();
  });

  it('rejects invalid email format', () => {
    const { error } = registerSchema.validate({ ...base, email: 'not-an-email' });
    expect(error).toBeDefined();
  });

  it('accepts optional fields alongside required fields', () => {
    const { error } = registerSchema.validate({
      ...base,
      fullName: 'Test User',
      phone: '0901234567',
      gender: 'male',
      height: 170,
      currentWeight: 65
    });
    expect(error).toBeUndefined();
  });

  it('rejects invalid gender value', () => {
    const { error } = registerSchema.validate({ ...base, gender: 'unknown' });
    expect(error).toBeDefined();
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const { error } = loginSchema.validate({ email: 'test@example.com', password: 'anypassword' });
    expect(error).toBeUndefined();
  });

  it('rejects missing password', () => {
    const { error } = loginSchema.validate({ email: 'test@example.com' });
    expect(error).toBeDefined();
  });

  it('rejects missing email', () => {
    const { error } = loginSchema.validate({ password: 'anypassword' });
    expect(error).toBeDefined();
  });
});

describe('updateProfileSchema', () => {
  it('accepts valid partial update', () => {
    const { error } = updateProfileSchema.validate({ fullName: 'New Name' });
    expect(error).toBeUndefined();
  });

  it('rejects empty object (min 1 field required)', () => {
    const { error } = updateProfileSchema.validate({});
    expect(error).toBeDefined();
  });

  it('rejects invalid gender', () => {
    const { error } = updateProfileSchema.validate({ gender: 'robot' });
    expect(error).toBeDefined();
  });
});
