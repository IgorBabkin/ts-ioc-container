import './helpers';
import { OpenAPIV3 } from 'openapi-types';
import Handlebars from 'handlebars/runtime';

require('../precompiled/templates.js');

function renderTemplate(filename: string, data: unknown) {
    const template = Handlebars.templates[filename];
    if (!template) {
        throw new Error(`Template not found: ${filename}`);
    }
    return template(data);
}

Handlebars.registerHelper('render_template', renderTemplate);

export const renderServer = (doc: OpenAPIV3.Document) => renderTemplate('Server.hbs', doc);
export const renderHttpClient = (doc: OpenAPIV3.Document) => renderTemplate('ApiClient.hbs', doc);

export { openapiToServer } from './useCases/openapiToServer';
export { openapiToClient } from './useCases/openapiToClient';
