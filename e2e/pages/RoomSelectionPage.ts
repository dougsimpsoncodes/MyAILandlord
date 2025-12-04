import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * RoomSelectionPage - Page Object for Room Selection screen (Step 3 of 8)
 *
 * Allows users to select which rooms are in the property.
 */
export class RoomSelectionPage extends BasePage {
  // Room options
  readonly roomOptions: Locator;
  readonly selectedRooms: Locator;

  // Common room types
  readonly livingRoomOption: Locator;
  readonly bedroomOption: Locator;
  readonly kitchenOption: Locator;
  readonly bathroomOption: Locator;
  readonly diningRoomOption: Locator;
  readonly garageOption: Locator;

  // Custom room
  readonly addCustomRoomButton: Locator;
  readonly customRoomInput: Locator;

  // Progress
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly stepIndicator: Locator;

  // Navigation
  readonly continueButton: Locator;
  readonly backButton: Locator;

  // Validation
  readonly selectionCount: Locator;
  readonly minSelectionMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Room list
    this.roomOptions = page.locator('[data-testid="room-option"], .room-option');
    this.selectedRooms = page.locator('[data-testid="room-option"][data-selected="true"], .room-option.selected');

    // Specific rooms
    this.livingRoomOption = page.getByText(/living room/i);
    this.bedroomOption = page.getByText(/bedroom/i);
    this.kitchenOption = page.getByText(/kitchen/i);
    this.bathroomOption = page.getByText(/bathroom/i);
    this.diningRoomOption = page.getByText(/dining room/i);
    this.garageOption = page.getByText(/garage/i);

    // Custom
    this.addCustomRoomButton = page.getByRole('button', { name: /add custom|add room|\+/i });
    this.customRoomInput = page.locator('input[placeholder*="room name" i], [data-testid="custom-room-input"]');

    // Progress
    this.progressBar = page.locator('[role="progressbar"], [data-testid="progress-bar"]');
    this.progressText = page.getByText(/% complete|\d of \d steps/i);
    this.stepIndicator = page.getByText(/step 3/i);

    // Navigation
    this.continueButton = page.getByRole('button', { name: /continue|next/i });
    this.backButton = page.locator('[data-testid="back-button"], [aria-label="Back"]');

    // Selection info
    this.selectionCount = page.getByText(/\d+ room|rooms selected/i);
    this.minSelectionMessage = page.getByText(/select at least/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/room-selection');
    await this.waitForLoad();
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const hasRooms = await this.roomOptions.first().isVisible({ timeout: 5000 });
      return hasRooms;
    } catch {
      return false;
    }
  }

  /**
   * Get count of available room options
   */
  async getRoomOptionCount(): Promise<number> {
    return await this.roomOptions.count();
  }

  /**
   * Get count of selected rooms
   */
  async getSelectedRoomCount(): Promise<number> {
    return await this.selectedRooms.count();
  }

  /**
   * Toggle a room selection by room name
   */
  async toggleRoom(roomName: string): Promise<void> {
    const roomOption = this.page.getByText(new RegExp(roomName, 'i'));
    await roomOption.click();
    await this.page.waitForTimeout(300); // Allow animation
  }

  /**
   * Select multiple rooms at once
   */
  async selectRooms(roomNames: string[]): Promise<void> {
    for (const name of roomNames) {
      await this.toggleRoom(name);
    }
  }

  /**
   * Select common default rooms (Living Room, Kitchen, Bedroom, Bathroom)
   */
  async selectDefaultRooms(): Promise<void> {
    await this.selectRooms(['Living Room', 'Kitchen', 'Bedroom', 'Bathroom']);
  }

  /**
   * Add a custom room
   */
  async addCustomRoom(roomName: string): Promise<void> {
    await this.addCustomRoomButton.click();
    await this.customRoomInput.waitFor({ state: 'visible' });
    await this.fillInput(this.customRoomInput, roomName);

    // Confirm custom room
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingComplete();
  }

  /**
   * Check if room is selected
   */
  async isRoomSelected(roomName: string): Promise<boolean> {
    const room = this.page.getByText(new RegExp(roomName, 'i'));
    const isSelected = await room.getAttribute('data-selected');
    if (isSelected === 'true') return true;

    // Check for selected class
    const classes = await room.getAttribute('class') || '';
    return classes.includes('selected');
  }

  /**
   * Continue to next step
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Go back to previous step
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Check if continue is enabled (requires room selection)
   */
  async isContinueEnabled(): Promise<boolean> {
    const button = this.continueButton;
    const disabled = await button.isDisabled();
    return !disabled;
  }
}
