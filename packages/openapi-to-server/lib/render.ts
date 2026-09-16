import '../hbs/index.cjs';
import { OpenAPIV3 } from 'openapi-types';
import { renderTemplate } from './templates/index.js';

export const renderComponents = (doc: OpenAPIV3.Document) => renderTemplate('Components.ts.hbs', doc);
export const renderControllers = (doc: OpenAPIV3.Document) => renderTemplate('Controllers.ts.hbs', doc);
export const renderServer = (doc: OpenAPIV3.Document) => renderTemplate('IServer.ts.hbs', doc);
export const renderClient = (doc: OpenAPIV3.Document) => renderTemplate('Client.hbs', doc);
