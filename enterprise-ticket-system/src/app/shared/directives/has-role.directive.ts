import { Directive, inject, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { RoleSlug } from '../models/user.model';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit {
  @Input({ required: true }) appHasRole!: RoleSlug | RoleSlug[];

  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    const userRole = this.authService.userRole();
    const allowedRoles = Array.isArray(this.appHasRole) ? this.appHasRole : [this.appHasRole];

    if (userRole && allowedRoles.includes(userRole)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
