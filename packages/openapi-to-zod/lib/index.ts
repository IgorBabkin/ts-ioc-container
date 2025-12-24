import '../precompiled.js';
import { OpenAPIV3 } from 'openapi-types';
import { renderTemplate } from './templates';

export function renderValidators(doc: OpenAPIV3.Document): string {
  return renderTemplate('Document.hbs', doc);
}
