import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AppTitleStrategy extends TitleStrategy {
  private readonly titleService = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let resolvedTitle: string | undefined;

    try {
      resolvedTitle = this.buildTitle(snapshot);
    } catch {
      // In tests or synthetic snapshot objects, buildTitle may fail on internal route symbols
    }

    if (!resolvedTitle && snapshot?.root) {
      let route = snapshot.root;
      while (route.firstChild) {
        route = route.firstChild;
      }
      resolvedTitle = route.data?.['title'];
    }

    if (resolvedTitle) {
      this.titleService.setTitle(`EcoBin Admin | ${resolvedTitle}`);
    } else {
      this.titleService.setTitle('EcoBin Admin');
    }
  }
}
