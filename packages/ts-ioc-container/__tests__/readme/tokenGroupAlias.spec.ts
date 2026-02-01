import { bindTo, Container, GroupAliasToken, inject, register, Registration as R } from '../../lib';

/**
 * Plugins - Group Alias Token
 *
 * Group tokens allow you to collect multiple implementations of an interface.
 * This is the basis for plugin architectures.
 *
 * Common use cases:
 * - Event Handlers: Register multiple listeners for an event
 * - Validators: Run a chain of validation rules
 * - Middlewares: Execute a pipeline of request processors
 * - Features: Collect all available features to display in UI
 */

const IValidatorToken = new GroupAliasToken('IValidator');

interface IValidator {
  validate(input: string): boolean;
  name: string;
}

@register(bindTo(IValidatorToken))
class LengthValidator implements IValidator {
  name = 'Length';
  validate(input: string): boolean {
    return input.length >= 3;
  }
}

@register(bindTo(IValidatorToken))
class FormatValidator implements IValidator {
  name = 'Format';
  validate(input: string): boolean {
    return /^[a-zA-Z]+$/.test(input);
  }
}

class FormService {
  // Inject ALL registered validators as an array
  constructor(@inject(IValidatorToken) public validators: IValidator[]) {}

  isValid(input: string): boolean {
    return this.validators.every((v) => v.validate(input));
  }

  getFailedValidators(input: string): string[] {
    return this.validators.filter((v) => !v.validate(input)).map((v) => v.name);
  }
}

describe('GroupAliasToken', function () {
  it('should inject all registered plugins/validators', function () {
    const container = new Container()
      .addRegistration(R.fromClass(LengthValidator))
      .addRegistration(R.fromClass(FormatValidator));

    const formService = container.resolve(FormService);

    // Valid input
    expect(formService.isValid('abc')).toBe(true);

    // Invalid length
    expect(formService.isValid('ab')).toBe(false);
    expect(formService.getFailedValidators('ab')).toContain('Length');

    // Invalid format
    expect(formService.isValid('123')).toBe(false);
    expect(formService.getFailedValidators('123')).toContain('Format');
  });
});
