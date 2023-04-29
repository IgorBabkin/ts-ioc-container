import { OpenAPIV3 } from 'openapi-types';

export function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isQueryParameter(
    parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
): parameter is OpenAPIV3.ParameterObject {
    return (parameter as OpenAPIV3.ParameterObject).in === 'query';
}

export function isReferenceObject(obj: unknown): obj is OpenAPIV3.ReferenceObject {
    return (obj as OpenAPIV3.ReferenceObject).$ref !== undefined;
}
