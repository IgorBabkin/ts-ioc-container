export interface IQueryHandler<TQuery, TResponse> {
    handle(query: TQuery): Promise<TResponse>;
}
