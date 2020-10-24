export interface IInjectable {
    dispose?(): void;
    postConstruct?(): void;
}
