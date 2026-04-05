import { classMeta, getClassMeta, paramMeta, getParamMeta, methodMeta, getMethodMeta } from '../../lib';

describe('metadata', () => {
  describe('Class Metadata', () => {
    it('should store and retrieve class metadata', () => {
      const FEATURE_KEY = 'feature:enabled';

      @classMeta(FEATURE_KEY, () => true)
      class FeatureService {
        getName() {
          return 'feature';
        }
      }

      const isEnabled = getClassMeta<boolean>(FeatureService, FEATURE_KEY);
      expect(isEnabled).toBe(true);
    });

    it('should accumulate class metadata with multiple decorators', () => {
      const TAGS_KEY = 'tags';

      @classMeta(TAGS_KEY, (prev: string[] = []) => [...prev, 'service'])
      @classMeta(TAGS_KEY, (prev: string[] = []) => [...prev, 'api'])
      class ApiService {
        getName() {
          return 'api';
        }
      }

      const tags = getClassMeta<string[]>(ApiService, TAGS_KEY);
      // Decorators apply bottom-to-top, so 'api' is added first, then 'service'
      expect(tags).toEqual(['api', 'service']);
    });
  });

  describe('Parameter Metadata', () => {
    it('should store and retrieve parameter metadata', () => {
      const INJECT_KEY = 'inject:constructor';

      class DatabaseService {
        constructor(
          @paramMeta(INJECT_KEY, () => 'config') config: any,
          @paramMeta(INJECT_KEY, () => 'logger') logger: any,
        ) {}
      }

      const metadata = getParamMeta(INJECT_KEY, DatabaseService);
      expect(metadata).toEqual(['config', 'logger']);
    });

    it('should handle sparse parameter metadata', () => {
      const INJECT_KEY = 'inject:constructor';

      class SparseService {
        constructor(
          first: any,
          @paramMeta(INJECT_KEY, () => 'second') second: any,
          third: any,
          @paramMeta(INJECT_KEY, () => 'fourth') fourth: any,
        ) {}
      }

      const metadata = getParamMeta(INJECT_KEY, SparseService);
      expect(metadata[1]).toBe('second');
      expect(metadata[3]).toBe('fourth');
      expect(metadata[0]).toBeUndefined();
      expect(metadata[2]).toBeUndefined();
    });
  });

  describe('Method Metadata', () => {
    it('should store and retrieve method metadata', () => {
      class Logger {
        @methodMeta('logLevel', () => 'info')
        info(message: string) {}

        @methodMeta('logLevel', () => 'error')
        error(message: string) {}
      }

      const logger = new Logger();
      expect(getMethodMeta('logLevel', logger, 'info')).toBe('info');
      expect(getMethodMeta('logLevel', logger, 'error')).toBe('error');
    });

    it('should accumulate method metadata', () => {
      const MIDDLEWARE_KEY = 'middleware';

      class Controller {
        @methodMeta(MIDDLEWARE_KEY, (prev: string[] = []) => [...prev, 'auth'])
        @methodMeta(MIDDLEWARE_KEY, (prev: string[] = []) => [...prev, 'validate'])
        handleRequest() {}
      }

      const controller = new Controller();
      const middleware = getMethodMeta(MIDDLEWARE_KEY, controller, 'handleRequest');
      // Decorators apply bottom-to-top, so 'validate' is added first, then 'auth'
      expect(middleware).toEqual(['validate', 'auth']);
    });
  });

  describe('Real-world Usage Pattern', () => {
    it('should use metadata for validation decorators', () => {
      const VALIDATORS_KEY = 'validators';

      const validate = (validator: (value: any) => boolean): MethodDecorator =>
        methodMeta(VALIDATORS_KEY, (prev: Array<(v: any) => boolean> = []) => [...prev, validator]);

      const runValidators = (instance: any, methodName: string, value: any): boolean => {
        const validators = getMethodMeta(VALIDATORS_KEY, instance, methodName) as Array<(v: any) => boolean>;
        if (!validators) return true;
        return validators.every((v) => v(value));
      };

      class UserService {
        @validate((v) => v.length > 0)
        @validate((v) => v.length <= 100)
        setUsername(username: string) {
          return username;
        }
      }

      const service = new UserService();
      expect(runValidators(service, 'setUsername', 'john')).toBe(true);
      expect(runValidators(service, 'setUsername', '')).toBe(false);
      expect(runValidators(service, 'setUsername', 'a'.repeat(101))).toBe(false);
    });
  });
});
