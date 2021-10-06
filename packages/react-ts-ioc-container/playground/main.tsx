import 'reflect-metadata';
import * as React from 'react';
import { render } from 'react-dom';
import { LocatorContext } from '../lib';
import { InjectMetadataCollector, IocLocatorBuilder, ProviderBuilder } from 'ts-ioc-container';
import { LocatorAdapter } from './LocatorAdapter';
import { onDisposeMetadataCollector } from './metadata';
import { IHomeModelKey } from './models/IHomeModel';
import { HomeModel } from './models/HomeModel';
import { AboutModel, IAboutModelKey } from './models/AboutModel';
import { App } from './App';

const locator = new IocLocatorBuilder(new InjectMetadataCollector(Symbol.for('contructor')))
    .withInjectorHook({
        onDispose<GInstance>(instance: GInstance) {
            onDisposeMetadataCollector.invokeHooksOf(instance);
        },
        onConstruct<GInstance>(instance: GInstance) {},
    })
    .build()
    .register(IHomeModelKey, ProviderBuilder.fromConstructor(HomeModel).forTags(['home']).build())
    .register(IAboutModelKey, ProviderBuilder.fromConstructor(AboutModel).forTags(['about']).build());

render(
    <LocatorContext.Provider value={new LocatorAdapter(locator)}>
        <App />
    </LocatorContext.Provider>,
    document.getElementById('root'),
);

if (module.hot) {
    module.hot.accept();
}
