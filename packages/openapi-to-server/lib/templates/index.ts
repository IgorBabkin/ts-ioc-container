import './helpers';
import Handlebars from 'handlebars/runtime';
import { OpenAPIV3 } from 'openapi-types';

require('../../precompiled/templates.js');

function renderTemplate(filename: string, data: unknown) {
    const template = Handlebars.templates[filename];
    if (!template) {
        throw new Error(`Template not found: ${filename}`);
    }
    return template(data);
}

Handlebars.registerHelper('render_template', renderTemplate);

export const renderClient = (doc: OpenAPIV3.Document) => renderTemplate('ApiClient.hbs', doc);
export const renderServer = (doc: OpenAPIV3.Document) => renderTemplate('Server.hbs', doc);