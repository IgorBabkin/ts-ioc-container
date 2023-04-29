import { OpenAPIV3 } from 'openapi-types';
import { PathBuilder } from './PathBuilder';
import { StringBuilder } from './StringBuilder';
import { SchemaBuilder } from './SchemaBuilder';
import { ServerBuilder } from './ServerBuilder';
import { BuilderComposer } from './BuilderComposer';

export class DocumentBuilder implements StringBuilder {
    private builderComposer = new BuilderComposer();
    private serverBuilder = new ServerBuilder();

    appendComponents({ schemas }: OpenAPIV3.ComponentsObject): void {
        if (schemas) {
            const componentBuilder = new SchemaBuilder();
            for (const name in schemas) {
                componentBuilder.append(name, schemas[name]);
            }
            this.builderComposer.append(componentBuilder);
        }
    }
    appendPaths(pathsObject: OpenAPIV3.PathsObject): void {
        const pathBuilder = new PathBuilder(this.serverBuilder);
        for (const pattern in pathsObject) {
            const pathItemObject = pathsObject[pattern] as OpenAPIV3.PathItemObject;
            if (pathItemObject.get) {
                pathBuilder.append(pathItemObject.get);
            }
            if (pathItemObject.post) {
                pathBuilder.append(pathItemObject.post);
            }
        }
        this.builderComposer.append(pathBuilder);
    }

    build() {
        this.builderComposer.append(this.serverBuilder);
        return this.builderComposer.build();
    }
}
