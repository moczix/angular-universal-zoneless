import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { mapTo } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ZonelessAppIsReady {
  public isReady(): Observable<boolean> {
    // zero to fix injector was destroyed
    return timer(0).pipe(mapTo(true));
  }
}
