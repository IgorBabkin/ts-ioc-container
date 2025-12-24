import { OpenAPIV3 } from 'openapi-types';
import { renderTemplate } from './templates';

export function renderValidators(doc: OpenAPIV3.Document): string {
  require('../precompiled.js');
  return renderTemplate('Document.hbs', doc);
}
