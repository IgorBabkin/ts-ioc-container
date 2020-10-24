export interface IMockAdapter<GMock, GInstance> {
    getInstance(): GInstance;

    getMock(): GMock;
}
