import { FileRepo } from './FileRepo';
import { DocumentBuilder } from './DocumentBuilder';
import { OpenAPIV3 } from 'openapi-types';
import './handlebarsHelpers';

export class ServerGenerator {
    private fileRepo: FileRepo;
    constructor(dirname: string) {
        this.fileRepo = new FileRepo(dirname);
    }

    generate(doc: OpenAPIV3.Document, filename: string) {
        const documentBuilder = new DocumentBuilder();

        if (doc.components) {
            documentBuilder.appendComponents(doc.components);
        }

        documentBuilder.appendPaths(doc.paths);

        this.fileRepo.save(filename, documentBuilder.build());
    }
}
