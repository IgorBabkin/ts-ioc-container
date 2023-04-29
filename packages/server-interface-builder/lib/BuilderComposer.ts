import { StringBuilder } from './StringBuilder';
import { ContentBuilder } from './ContentBuilder';

export class BuilderComposer implements StringBuilder {
    private builders: StringBuilder[] = [];

    append(builder: StringBuilder): this {
        this.builders.push(builder);
        return this;
    }

    build(): string {
        const contentBuilder = new ContentBuilder();
        this.builders.forEach((builder) => contentBuilder.append(builder.build()));
        return contentBuilder.build();
    }
}
