import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';
import { assertEnvironment } from './environments/assert-environment';

assertEnvironment(environment);

if (environment.e2e && typeof window !== 'undefined') {
  (window as unknown as { __mockCalls?: number }).__mockCalls = 0;
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

