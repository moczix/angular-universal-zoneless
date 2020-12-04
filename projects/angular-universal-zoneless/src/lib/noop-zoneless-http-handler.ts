import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpBackend, HttpEvent, HttpRequest } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class NoopZonelessHttpHandler implements HttpBackend {
  constructor(private _backend: HttpBackend) { }

  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    return this._backend.handle(req);
  }
}