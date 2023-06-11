import Handlebars from 'handlebars';
import { capitalize } from '../utils';

Handlebars.registerHelper('capitalize', capitalize);
Handlebars.registerHelper('excludes', function (arr: string[] | undefined = [], value: string) {
    return !arr.includes(value);
});

Handlebars.registerHelper('includes', function (arr: string[], value: string) {
    return arr.includes(value);
});
Handlebars.registerHelper('is_equal', function (a: unknown, b: unknown) {
    return a === b;
});
Handlebars.registerHelper('has_property', function (a: unknown) {
    return !!a;
});

const last = (arr: string[]) => arr[arr.length - 1];
Handlebars.registerHelper('render_ref', function (value: string) {
    return last(value.split('/'));
});

Handlebars.registerHelper('render_ref', function (value: string) {
    return last(value.split('/'));
});
