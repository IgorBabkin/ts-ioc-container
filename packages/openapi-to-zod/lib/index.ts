import '../hbs/index.cjs';
import { OpenAPIV3 } from 'openapi-types';
import { renderTemplate } from './templates/index.js';

export function renderValidators(doc: OpenAPIV3.Document): string {
  return renderTemplate('Document.hbs', doc);
}
