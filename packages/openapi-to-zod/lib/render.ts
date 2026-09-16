import '../hbs/index.cjs';
import { OpenAPIV3 } from 'openapi-types';
import { renderTemplate } from './templates/index.js';

export const renderValidators = (doc: OpenAPIV3.Document) => renderTemplate('Document.hbs', doc);
