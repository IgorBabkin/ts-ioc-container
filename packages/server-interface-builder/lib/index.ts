import { FileRepo } from './FileRepo';
import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from './templates';

export class ServerGenerator {
    private fileRepo: FileRepo;

    constructor(dirname: string) {
        this.fileRepo = new FileRepo(dirname);
    }

    generate(doc: OpenAPIV3.Document, filename: string) {
        this.fileRepo.save(filename, renderDocument(doc));
    }
}
