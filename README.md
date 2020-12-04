# AngularUniversalZoneless

this library is for projects which want angular universal without zonejs. I comercially use angular without zonejs in CSR, and was searching a way to use universal the same way. I looked inside angular universal source and modify code a little.

this is the way.

# usage

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
        document: '<bcf-root></bcf-root>'
      },
      { ngZone: 'noop' }
    );
    res.write(html);
    res.end();
  });
```