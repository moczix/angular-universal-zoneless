# AngularUniversalZoneless

this library is for projects which want angular universal without zonejs. I comercially use angular without zonejs in CSR, and was searching a way to use universal the same way. I looked inside angular universal source and modify code a little.

this is the way.

# usage
## 1.
in your server.ts update :
```
const zonelessEngine: ZonelessUniversalEngine = new ZonelessUniversalEngine();
```
```
  server.get('*', async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
    const html: string = await zonelessEngine.render(
      {
        url: `http://${req.headers.host}${req.url}`,
        bootstrap: appModule,
        providers: [{ provide: APP_BASE_HREF, useValue: '/' }],
        document: '<app-root></app-root>'
      },
      { ngZone: 'noop' }
    );
    res.write(html);
    res.end();
  });
```

## 2.
update app.server.module.ts

```
providers: [
    ...

    { provide: ZonelessAppIsReady, useClass: SsrAppReady },
    { provide: HttpHandler, useClass: SsrHttpNetworksStabler }

    ...
]
```

SsrAppReady : this is class which tell our server when the app is ready: if all http request is completed for example
SsrHttpNetworksStabler : this is the class which interact with http request, something like http interceptor.

this is my classes:

```
@Injectable({ providedIn: 'root' })
export class SsrAppReady {
  constructor(private _appReadyContainer: SrrAppReadyContainer, private _appReadyService: AppReadyService) {}

  public isReady(): Observable<boolean> {
    const start: number = new Date().getTime();
    return combineLatest([
      race(this._appReadyContainer.requestCounterUpdate$, timer(10).pipe(mapTo(null))).pipe(
        map(() => this._appReadyContainer.requestCounter === 0),
        tap((done: boolean) => {
          if (done) {
            console.log('request done in ', new Date().getTime() - start);
          }
        })
      ),
      this._appReadyService.isReady()
    ]).pipe(
      first(([requestsFinish, appIsReady]: [boolean, boolean]) => requestsFinish && appIsReady),
      delay(10),
      mapTo(true),
      tap(() => console.log('app will be rendered', new Date().getTime() - start))
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class SrrAppReadyContainer {
  public requestCounterUpdate$: Subject<void> = new Subject<void>();
  public requestCounter: number = 0;
}

@Injectable({
  providedIn: 'root'
})
export class SsrHttpNetworksStabler {
  constructor(private _backend: HttpBackend, private _appReadyContainer: SrrAppReadyContainer) {}

  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    this._appReadyContainer.requestCounter++;
    this._appReadyContainer.requestCounterUpdate$.next(null);
    console.log('should send request', req.url);
    return this._backend.handle(req).pipe(
      tap(() => {
        console.log('request received OK', req.url);
        this._appReadyContainer.requestCounter--;
        this._appReadyContainer.requestCounterUpdate$.next(null);
      }),
      catchError((err: unknown) => {
        console.log('request received NOT OK');
        this._appReadyContainer.requestCounter--;
        this._appReadyContainer.requestCounterUpdate$.next(null);
        return throwError(err);
      })
    );
  }
}
```