import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  // Throttled DB check: validates session token against the DB at most once per 30s.
  // If invalid, checkSessionValidity() calls handleSessionInvalidated() which
  // does a full page reload to /auth/login — authGuard just returns false here.
  await authService.checkSessionValidity();

  // Re-check after validation — handleSessionInvalidated() may have been called
  // which sets _session to null via signal. If so, block the route.
  if (!authService.isAuthenticated()) {
    return false;
  }

  return true;
};
