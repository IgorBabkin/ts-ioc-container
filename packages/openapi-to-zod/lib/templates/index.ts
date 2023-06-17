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

export const renderDocument = (doc: OpenAPIV3.Document) => renderTemplate('Document.hbs', doc);
