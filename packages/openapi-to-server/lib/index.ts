import { OpenAPIV3 } from 'openapi-types';
import { renderTemplate } from './templates';

export { HttpResponse, HttpStatus, Route, RouteOptions, constructor } from './types';

export const renderComponents = (doc: OpenAPIV3.Document) => {
  require('../precompiled.js');
  return renderTemplate('Components.ts.hbs', doc);
};

export const renderControllers = (doc: OpenAPIV3.Document) => {
  require('../precompiled.js');
  return renderTemplate('Controllers.ts.hbs', doc);
};

export const renderServer = (doc: OpenAPIV3.Document) => {
  require('../precompiled.js');
  return renderTemplate('IServer.ts.hbs', doc);
};
