import {
  ApplicationRef,
  NgModuleFactory,
  NgModuleRef,
  PlatformRef,
  StaticProvider,
  Type,
  ɵisPromise
} from '@angular/core';
import * as fs from 'fs';
import { ɵCommonEngine as CommonEngine, ɵRenderOptions as RenderOptions } from '@nguniversal/common/engine';
import { BEFORE_APP_SERIALIZED, INITIAL_CONFIG, platformServer, PlatformState } from '@angular/platform-server';
import { ɵTRANSITION_ID } from '@angular/platform-browser';
import { first, mergeMap } from 'rxjs/operators';
import { BootstrapOptions, PlatformOptions } from './interfaces';
import { ZonelessAppIsReady } from './zoneless-app-is-ready';


function _getPlatform(
  platformFactory: (extraProviders: StaticProvider[]) => PlatformRef,
  options: PlatformOptions
): PlatformRef {
  const extraProviders: StaticProvider[] = options.extraProviders ? options.extraProviders : [];
  return platformFactory([
    { provide: INITIAL_CONFIG, useValue: { document: options.document, url: options.url } },
    extraProviders
  ]);
}

function _render<T>(platform: PlatformRef, moduleRefPromise: Promise<NgModuleRef<T>>): Promise<string> {
  return moduleRefPromise.then((moduleRef: NgModuleRef<T>) => {
    const transitionId: unknown = moduleRef.injector.get(ɵTRANSITION_ID, null);
    if (!transitionId) {
      throw new Error(
        `renderModule[Factory]() requires the use of BrowserModule.withServerTransition() to ensure
  the server-rendered app can be properly bootstrapped into a client app.`
      );
    }
    const applicationRef: ApplicationRef = moduleRef.injector.get(ApplicationRef);
    const isAppReady: ZonelessAppIsReady = moduleRef.injector.get(ZonelessAppIsReady);

    return isAppReady
      .isReady()
      .pipe(
        mergeMap(() => applicationRef.isStable),
        first((isStable: boolean) => isStable)
      )
      .toPromise()
      .then(() => {
        const platformState: PlatformState = platform.injector.get(PlatformState);

        const asyncPromises: Promise<any>[] = [];

        // Run any BEFORE_APP_SERIALIZED callbacks just before rendering to string.
        const callbacks: (() => void | Promise<void>)[] | null = moduleRef.injector.get(BEFORE_APP_SERIALIZED, null);
        if (callbacks) {
          for (const callback of callbacks) {
            try {
              const callbackResult: void | Promise<void> = callback();
              if (ɵisPromise(callbackResult)) {
                // TODO: in TS3.7, callbackResult is void.
                asyncPromises.push(callbackResult as any);
              }
            } catch (e) {
              // Ignore exceptions.
              console.warn('Ignoring BEFORE_APP_SERIALIZED Exception: ', e);
            }
          }
        }

        const complete = (): string => {
          const output: string = platformState.renderToString();
          platform.destroy();
          return output;
        };

        if (asyncPromises.length === 0) {
          return complete();
        }

        return Promise.all(
          asyncPromises.map((asyncPromise: Promise<any>) => {
            return asyncPromise.catch((e: any) => {
              console.warn('Ignoring BEFORE_APP_SERIALIZED Exception: ', e);
            });
          })
        ).then(complete);
      });
  });
}

export class ZonelessUniversalEngine {
  private _commonEngine: CommonEngine = new CommonEngine();
  private _templateCache: { [key: string]: string } = {};
  private _moduleOrFactory?: Type<{}> | NgModuleFactory<{}>;
  private _providers: StaticProvider[] = [];

  public async render(opts: RenderOptions, bootstrapOptions: BootstrapOptions): Promise<string> {
    const doc: string = opts.document || (await this._getDocument(opts.documentFilePath as string));
    const extraProviders: StaticProvider[] = [
      ...(opts.providers || []),
      ...(this._providers || []),
      {
        provide: INITIAL_CONFIG,
        useValue: {
          document: doc,
          url: opts.url
        }
      }
    ];

    const moduleOrFactory: Type<{}> | NgModuleFactory<{}> = this._moduleOrFactory || opts.bootstrap;
    const factory: NgModuleFactory<{}> = await this._commonEngine.getFactory(moduleOrFactory);

    return this._renderModuleFactory(factory, { extraProviders }, bootstrapOptions);
  }

  /** Retrieve the document from the cache or the filesystem */
  private _getDocument(filePath: string): Promise<string> {
    const doc: string = (this._templateCache[filePath] =
      this._templateCache[filePath] || fs.readFileSync(filePath).toString());

    // As  promise so we can change the API later without breaking
    return Promise.resolve(doc);
  }

  private _renderModuleFactory<T>(
    moduleFactory: NgModuleFactory<T>,
    options: { document?: string; url?: string; extraProviders?: StaticProvider[] },
    bootstrapOptions?: BootstrapOptions
  ): Promise<string> {
    const platform: PlatformRef = _getPlatform(platformServer, options);
    return _render(platform, platform.bootstrapModuleFactory(moduleFactory, bootstrapOptions));
  }
}