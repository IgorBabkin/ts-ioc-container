import '../handlebars/helpers';
import { OpenAPIV3 } from 'openapi-types';
import { HandlebarsCompiler } from '../handlebars/HandlebarsCompiler';
import Handlebars from 'handlebars';

const compiler = new HandlebarsCompiler(__dirname);

export function renderTemplate(filename: string, data: unknown) {
    const template = compiler.compile(filename);
    return template(data);
}

export const renderDocument = (doc: OpenAPIV3.Document) => renderTemplate('./Document.hbs', doc);

Handlebars.registerHelper('render_template', renderTemplate);
