import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { ManifestComponent } from './components/manifest/manifest.component';

const  APP_ROUTES: Routes = [
  { path: 'altadebroker', component: LandingComponent },
  { path: 'manifiesto/:id', component: ManifestComponent },
  { path: '**', pathMatch: 'full', redirectTo: 'altadebroker'}
];

export const  APP_ROUTING = RouterModule.forRoot(APP_ROUTES);
