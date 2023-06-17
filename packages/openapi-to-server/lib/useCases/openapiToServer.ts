import { OpenAPIV3 } from 'openapi-types';
import { isYAML, loadYAML } from '../utils/yaml';
import { loadJSON } from '../utils/json';
import { getFilenameWithoutPath, getPathToFileWithoutFileName, saveFile } from '../utils/file';
import path from 'path';
import { renderServer } from '../index';

type Props = {
    inputFile: string;
    outputFile: string;
    emitJSON?: boolean;
};

export function openapiToServer({ inputFile, outputFile, emitJSON }: Props) {
    const content: OpenAPIV3.Document = isYAML(inputFile) ? loadYAML(inputFile) : loadJSON(inputFile);
    if (emitJSON && isYAML(inputFile)) {
        const inputFilename: string = getFilenameWithoutPath(inputFile);
        const outputPath: string = getPathToFileWithoutFileName(outputFile);
        saveFile(path.resolve(outputPath, inputFilename.replace(/\.yaml$/, '.json')), JSON.stringify(content, null, 2));
    }
    saveFile(outputFile, renderServer(content));
}
