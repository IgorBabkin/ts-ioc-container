export interface IMockAdapter<GMock, GInstance> {
    instance: GInstance;
    mock: GMock;
}
