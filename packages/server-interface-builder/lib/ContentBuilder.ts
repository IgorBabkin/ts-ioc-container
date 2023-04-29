import { StringBuilder } from './StringBuilder';

export class ContentBuilder implements StringBuilder {
    private content: string[] = [];

    append(content: string) {
        this.content.push(content);
    }

    build(): string {
        return this.content.join('\n\r');
    }
}
