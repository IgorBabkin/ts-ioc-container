import './handlebars/helpers';
import { OpenAPIV3 } from 'openapi-types';
import { HandlebarsCompiler } from './handlebars/HandlebarsCompiler';
import Handlebars from 'handlebars';

const compiler = new HandlebarsCompiler(__dirname);
export const documentTemplate = compiler.compile<OpenAPIV3.Document>('./Document.hbs');

Handlebars.registerHelper('render_template', function (filename: string, data: unknown) {
    const template = compiler.compile(filename);
    return template(data);
});
