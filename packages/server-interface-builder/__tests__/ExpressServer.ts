import {
    IAddInventoryPayload,
    IAddInventoryResponse,
    ISearchInventoryPayload,
    ISearchInventoryResponse,
    IServer,
} from './output';
import { IMediator, IQueryHandler } from 'ts-request-mediator/lib';

class AddInventory implements IQueryHandler<any, any> {
    handle(query: any): Promise<any> {
        return Promise.resolve(undefined);
    }
}

export class ExpressServer implements IServer {
    constructor(private mediator: IMediator) {}
    async addInventory(payload: IAddInventoryPayload): Promise<IAddInventoryResponse> {
        return this.mediator.send(AddInventory, payload);
    }

    async searchInventory({ query }: ISearchInventoryPayload): Promise<ISearchInventoryResponse> {
        console.log(query);
        return [];
    }
}
