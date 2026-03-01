import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Network error. Please check your connection.';
      } else if (error.status === 401) {
        message = 'Unauthorized. Please log in again.';
      } else if (error.status === 403) {
        message = 'Access denied. You do not have permission.';
      } else if (error.status === 404) {
        message = 'The requested resource was not found.';
      } else if (error.status === 422) {
        message = error.error?.message ?? 'Validation error.';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      }

      console.error('[HTTP Error]', error.status);
      toastService.error(message);
      return throwError(() => error);
    }),
  );
};
