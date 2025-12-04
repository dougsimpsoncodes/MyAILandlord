/**
 * Page Object Model Exports
 *
 * Central export point for all Page Objects.
 * Import from this file for cleaner test code:
 *
 * import { PropertyManagementPage, AddPropertyPage } from './pages';
 */

export { BasePage } from './BasePage';
export { PropertyManagementPage } from './PropertyManagementPage';
export { AddPropertyPage } from './AddPropertyPage';
export { PropertyPhotosPage } from './PropertyPhotosPage';
export { RoomSelectionPage } from './RoomSelectionPage';

// Re-export legacy page objects for backward compatibility
export {
  WelcomeScreenPO,
  LoginScreenPO,
  SignUpScreenPO,
  RoleSelectScreenPO,
  DashboardPO,
  MaintenanceRequestFormPO,
  PropertyFormPO,
  PropertyInvitePO,
  NavigationHelper,
} from '../helpers/page-objects';
