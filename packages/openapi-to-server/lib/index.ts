import '../hbs/index.cjs';
import { OpenAPIV3 } from 'openapi-types';
import { renderTemplate } from './templates/index.js';

export { HttpResponse, HttpStatus, Route, RouteOptions, constructor } from './types.js';

export const renderComponents = (doc: OpenAPIV3.Document) => {
  return renderTemplate('Components.ts.hbs', doc);
};

export const renderControllers = (doc: OpenAPIV3.Document) => {
  return renderTemplate('Controllers.ts.hbs', doc);
};

export const renderServer = (doc: OpenAPIV3.Document) => {
  return renderTemplate('IServer.ts.hbs', doc);
};
