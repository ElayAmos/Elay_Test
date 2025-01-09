const { Builder, By, until, Key } = require('selenium-webdriver');
const assert = require('assert');
const fs = require('fs').promises;

/**
 * Class representing the User Management Test automation
 * Test Script Steps:
 * 1. Initial Setup - Verify user-supplier connections
 * 2. Change user name from 'אילי בדיקה' to 'אילי עמוס'
 * 3. Verify supplier management for 'בדיקת ספק' after name change
 * 4. Verify supplier management for 'אילי' and 'mister doom' after name change
 * 5. Reset user name to default if test fails
 */
class UserManagementTest {
    constructor() {
        this.driver = null;
        this.baseUrl = 'https://dev.tevelhatal.com';
        this.timeout = 20000;
        this.defaultDelay = 1500;  // Default delay between actions
        this.typeDelay = 100;      // Delay between keystrokes when typing
        this.originalUserName = 'אילי בדיקה'; // Default user name
        this.newUserName = 'אילי עמוס'; // New user name
        this.emailToCheck = 'ilayamos44@gmail.com'; // Email to check
    }

    /**
     * Initialize the WebDriver and maximize window
     */
    async init() {
        this.driver = await new Builder().forBrowser('chrome').build();
        await this.driver.manage().window().maximize();
        await this.driver.sleep(this.defaultDelay);
    }

    /**
     * Wait for element to be visible and scrolls it into view
     * @param {By} selector - Selenium By selector
     * @param {number} timeout - Timeout in milliseconds
     */
    async waitForElement(selector, timeout = this.timeout) {
        const element = await this.driver.wait(until.elementLocated(selector), timeout);
        await this.driver.wait(until.elementIsVisible(element), timeout);
        await this.driver.sleep(500); // Short pause after finding element
        return element;
    }

    /**
     * Type text slowly for better visibility and stability
     * @param {WebElement} element - The input element
     * @param {string} text - Text to type
     */
    async typeSlowly(element, text) {
        for (const char of text) {
            await element.sendKeys(char);
            await this.driver.sleep(this.typeDelay);
        }
        await this.driver.sleep(500);
    }

    /**
     * Login to the application
     */
    async login() {
        console.log("Logging in to the application...");
        await this.driver.get(this.baseUrl);
        await this.driver.sleep(this.defaultDelay);
        
        const emailInput = await this.waitForElement(By.css('input[data-cy="email"]'));
        await this.typeSlowly(emailInput, 'omriAdmin@tevel.com');
        
        const passwordInput = await this.waitForElement(By.css('input[data-cy="password"]'));
        await this.typeSlowly(passwordInput, 'omriPass123');
        
        await this.driver.sleep(500);
        await (await this.waitForElement(By.css('button[data-cy="button-login"]'))).click();
        await this.driver.sleep(this.defaultDelay);
    }

    /**
     * Main test execution method
     */
    async runTest() {
        try {
            console.log("Starting test execution...");
            await this.login();
            
            console.log("Navigating to user management...");
            const userManagementLink = await this.waitForElement(
                By.xpath('//a[contains(text(), "ניהול משתמשים")]')
            );
            await this.driver.sleep(500);
            await userManagementLink.click();
            await this.driver.sleep(this.defaultDelay);

            await this.verifyInitialUserSupplierConnections();
            await this.changeUserName();
            await this.verifySupplierManagementForSupplierB(); // Check 'בדיקת ספק'
            await this.verifySupplierManagementForOtherSuppliers(); // Check 'אילי' and 'mister doom'
            await this.testConflictScenarios();

            console.log("Test completed successfully!");
        } catch (error) {
            console.error("Test failed:", error);
            await this.resetUserName(); // Reset user name to default on failure
        } finally {
            await this.driver.sleep(this.defaultDelay);
            await this.driver.quit();
        }
    }

    /**
     * Step 1: Verify initial connections between users and suppliers
     */
    async verifyInitialUserSupplierConnections() {
        try {
            console.log("Verifying initial user-supplier connections...");
            
            const suppliersTab = await this.waitForElement(
                By.xpath("//div[@role='tab']//div[contains(text(), 'ספקים')]")
            );
            
            await this.driver.sleep(1000);
            
            await this.driver.executeScript(`
                const header = document.querySelector('.fixed');
                if (header) {
                    header.style.position = 'static';
                }
            `);
            
            await suppliersTab.click();
            await this.driver.sleep(this.defaultDelay);

            const suppliersToCheck = [
                { name: 'אילי', expectedUser: 'אילי בדיקה' },
                { name: 'mister doom', expectedUser: 'אילי בדיקה' },
                { name: 'בדיקת ספק', expectedUser: 'אילי עמוס' }
            ];

            for (const { name: supplierName, expectedUser } of suppliersToCheck) {
                console.log(`Checking supplier: ${supplierName}`);

                const searchInput = await this.waitForElement(
                    By.css('div[data-cy="card-content"] input[data-cy="search"][role="search"]')
                );
                await searchInput.clear();
                await this.driver.sleep(500);
                await this.typeSlowly(searchInput, supplierName);

                const searchButton = await this.waitForElement(
                    By.css('div[data-cy="card-content"] button[data-cy="button-undefined"]')
                );
                await searchButton.click();
                await this.driver.sleep(this.defaultDelay);

                const editIcon = await this.waitForElement(
                    By.css('span[data-cy="action-0"] a svg[role="edit"]')
                );
                await editIcon.click();
                await this.driver.sleep(this.defaultDelay);

                const userTags = await this.driver.findElements(
                    By.css('div[role="tag"]')
                );

                let userFound = false;
                for (const tag of userTags) {
                    const tagText = await tag.getText();
                    if (tagText.includes(expectedUser)) {
                        userFound = true;
                        break;
                    }
                }

                assert.ok(userFound, `Expected user ${expectedUser} was not found for supplier ${supplierName}`);

                const cancelButton = await this.waitForElement(
                    By.xpath('//button[contains(text(), "ביטול")]')
                );
                await cancelButton.click();
                await this.driver.sleep(this.defaultDelay);
            }
        } catch (error) {
            console.error("Failed to verify initial connections:", error);
            throw error;
        }
    }

    /**
     * Step 2: Change user name from 'אילי בדיקה' to 'אילי עמוס'
     */
    async changeUserName() {
        try {
            console.log("Changing user name...");
            
            const usersTab = await this.waitForElement(
                By.xpath("//div[@role='tab']//div[contains(text(), 'משתמשים')]")
            );
            await usersTab.click();
            await this.driver.sleep(this.defaultDelay);

            const searchInput = await this.waitForElement(
                By.css('input[data-cy="search"][role="search"]')
            );
            await searchInput.clear();
            await this.driver.sleep(500);
            await this.typeSlowly(searchInput, this.originalUserName);

            const searchButton = await this.waitForElement(
                By.css('button[data-cy="button-undefined"] svg')
            );
            await searchButton.click();
            await this.driver.sleep(this.defaultDelay);

            const editIcon = await this.waitForElement(
                By.css('span[data-cy="action-3"] a svg[role="edit"]')
            );
            await editIcon.click();
            await this.driver.sleep(this.defaultDelay);

            const fullNameInput = await this.waitForElement(
                By.css('input[data-cy="fullname"][role="search"]')
            );
            await fullNameInput.clear();
            await this.driver.sleep(1000); // Wait longer after clearing

            const currentValue = await fullNameInput.getAttribute('value');
            if (currentValue) {
                await fullNameInput.sendKeys(Key.CONTROL, 'a');
                await this.driver.sleep(500);
                await fullNameInput.sendKeys(Key.DELETE);
                await this.driver.sleep(500);
            }

            await this.typeSlowly(fullNameInput, this.newUserName);

            const saveButton = await this.waitForElement(
                By.xpath('//button[contains(text(), "שמור שינויים")]')
            );
            await saveButton.click();
            await this.driver.sleep(this.defaultDelay);

        } catch (error) {
            console.error("Failed to change user name:", error);
            throw error;
        }
    }

    /**
     * Step 3: Verify supplier management for user B after name change
     */
    async verifySupplierManagementForSupplierB() {
        try {
            console.log("Verifying supplier management for user B...");
            
            const suppliersTab = await this.waitForElement(
                By.xpath("//div[@role='tab']//div[contains(text(), 'ספקים')]")
            );
            await suppliersTab.click();
            await this.driver.sleep(this.defaultDelay);

            const editButton = await this.waitForElement(
                By.css('span[data-cy="action-0"] a svg[role="edit"]')
            );
            await editButton.click();
            await this.driver.sleep(this.defaultDelay);

            const userTags = await this.driver.findElements(
                By.css('div[role="tag"]')
            );
            
            let userFound = false;
            for (const tag of userTags) {
                const tagText = await tag.getText();
                if (tagText.includes('אילי עמוס')) {
                    userFound = true;
                    break;
                }
            }

            assert.ok(userFound, `Expected user אילי עמוס to be connected to the supplier`);

            const cancelButton = await this.waitForElement(
                By.xpath('//button[contains(text(), "ביטול")]')
            );
            await cancelButton.click();
            await this.driver.sleep(this.defaultDelay);
        } catch (error) {
            console.error("Failed to verify supplier management for user B:", error);
            throw error;
        }
    }

    /**
     * Step 4: Verify supplier management for user A after name change
     */
    async verifySupplierManagementForOtherSuppliers() {
        try {
            console.log("Verifying supplier management for other users...");
            
            const suppliers = ['אילי', 'mister doom'];
            for (const supplier of suppliers) {
                console.log(`Checking supplier: ${supplier}`);
                
                const searchInput = await this.waitForElement(
                    By.css('input[data-cy="search"][role="search"]')
                );
                await searchInput.clear();
                await this.driver.sleep(500);
                await this.typeSlowly(searchInput, supplier);

                const searchButton = await this.waitForElement(
                    By.css('button[data-cy="button-undefined"]')
                );
                await searchButton.click();
                await this.driver.sleep(this.defaultDelay);

                const editButton = await this.waitForElement(
                    By.css('span[data-cy="action-0"] a svg[role="edit"]')
                );
                await editButton.click();
                await this.driver.sleep(this.defaultDelay);

                const userTags = await this.driver.findElements(
                    By.css('div[role="tag"]')
                );
                
                let userFound = false;
                for (const tag of userTags) {
                    const tagText = await tag.getText();
                    if (tagText.includes('אילי עמוס')) {
                        userFound = true;
                        break;
                    }
                }

                assert.ok(userFound, 'Expected user אילי עמוס to be connected to the supplier');

                const cancelButton = await this.waitForElement(
                    By.xpath('//button[contains(text(), "ביטול")]')
                );
                await cancelButton.click();
                await this.driver.sleep(this.defaultDelay);
            }
        } catch (error) {
            console.error("Failed to verify supplier management for other users:", error);
            throw error;
        }
    }

   /**
 * Step 5: Test conflict scenarios by removing and readding users
 */
/**
 * Step 5: Test conflict scenarios by removing and readding users
 */
async testConflictScenarios() {
    try {
        console.log("Testing conflict scenarios...");
        
        const suppliers = ['אילי', 'mister doom', 'בדיקת ספק'];
        
        for (const supplier of suppliers) {
            console.log(`Testing conflict scenario for supplier: ${supplier}`);
            
            const editButton = await this.waitForElement(
                By.css('span[data-cy="action-0"] a svg[role="edit"]')
            );
            await editButton.click();
            await this.driver.sleep(this.defaultDelay);

            // Find the remove buttons (the "X" button)
            const removeButtons = await this.driver.waitForElement(
                By.xpath("//svg[@role='remove-tag']")
            );
            await removeButtons.click(); // Attempt to click the remove button
            await this.driver.sleep(this.defaultDelay);

            let removalSuccess = true; // Flag to check if removal was successful
            for (const button of removeButtons) {
                try {
                    await button.click(); // Attempt to click the remove button
                    await this.driver.sleep(this.defaultDelay);
                } catch (error) {
                    console.error(`Failed to click remove button for supplier '${supplier}':`, error);
                    removalSuccess = false; // Set flag to false if removal fails
                }
            }

            // Check if the input for users is still not empty
            const userInput = await this.waitForElement(
                By.css('input[data-cy="usersIds"][role="search"]')
            );
            const inputValue = await userInput.getAttribute('value');

            if (inputValue) { // If the input is not empty
                console.error(`Error: User input for supplier '${supplier}' is not empty after removal attempt.`);
                removalSuccess = false; // Set flag to false
            }

            if (!removalSuccess) {
                console.log(`Could not remove user from supplier: ${supplier}`);
            } else {
                // Change the user to "המנהל שלי" if the input is empty
                await userInput.clear();
                await this.driver.sleep(500);
                await this.typeSlowly(userInput, 'המנהל שלי');

                const option = await this.waitForElement(
                    By.xpath("//div[@data-cy='option' and contains(text(), 'המנהל שלי')]")
                );
                await option.click();
                await this.driver.sleep(this.defaultDelay);

                const saveButton = await this.waitForElement(
                    By.xpath("//button[contains(., 'שמור שינויים')]")
                );
                await saveButton.click();
                await this.driver.sleep(this.defaultDelay);
            }

            const cancelButton = await this.waitForElement(
                By.xpath('//button[contains(text(), "ביטול")]')
            );
            await cancelButton.click();
            await this.driver.sleep(this.defaultDelay);
        }

        const supplierUserMap = {
            'אילי': 'אילי בדיקה',
            'mister doom': 'אילי בדיקה',
            'בדיקת ספק': 'אילי עמוס'
        };

        for (const [supplier, user] of Object.entries(supplierUserMap)) {
            console.log(`Re-adding user ${user} to supplier ${supplier}`);
            
            const addUserButton = await this.waitForElement(
                By.xpath(`//tr[contains(., '${supplier}')]//button[contains(., 'הוסף משתמש')]`)
            );
            await addUserButton.click();
            await this.driver.sleep(this.defaultDelay);

            const userSelect = await this.waitForElement(By.css('select[name="userId"]'));
            await userSelect.sendKeys(user);
            await this.driver.sleep(this.defaultDelay);
            
            const confirmButton = await this.waitForElement(
                By.xpath("//button[contains(., 'אישור')]")
            );
            await confirmButton.click();
            await this.driver.sleep(this.defaultDelay);
        }
    } catch (error) {
        console.error("Failed to test conflict scenarios:", error);
        throw error;
    }
}
    /**
     * Reset user name to default if test fails
     */
    async resetUserName() {
        try {
            console.log("Resetting user name to default...");
        

            // Navigate to Users tab
            const usersTab = await this.waitForElement(
                By.xpath("//div[@role='tab']//div[contains(text(), 'משתמשים')]")
            );
            await usersTab.click();
            await this.driver.sleep(this.defaultDelay);

            // Search for the user
            const searchInput = await this.waitForElement(
                By.css('input[data-cy="search"][role="search"]')
            );
            await searchInput.clear();
            await this.driver.sleep(500);
            await this.typeSlowly(searchInput, this.newUserName);

            // Click search button
            const searchButton = await this.waitForElement(
                By.css('button[data-cy="button-undefined"] svg')
            );
            await searchButton.click();
            await this.driver.sleep(this.defaultDelay);

            // Check for the user with the specified email
            const emailElement = await this.waitForElement(
                By.xpath(`//div[contains(text(), "${this.emailToCheck}")]`)
            );

            if (emailElement) {
                console.log("User with specified email found. Editing user...");
                
                // Click edit icon
                const editIcon = await this.waitForElement(
                    By.css('span[data-cy="action-3"] a svg[role="edit"]')
                );
                await editIcon.click();
                await this.driver.sleep(this.defaultDelay);

                // Clear the full name input
                const fullNameInput = await this.waitForElement(
                    By.css('input[data-cy="fullname"][role="search"]')
                );
                await fullNameInput.sendKeys(Key.CONTROL, 'a');
                await fullNameInput.sendKeys(Key.DELETE);
                await this.driver.sleep(1000); // Wait longer after clearing

                // Enter the default name
                await this.typeSlowly(fullNameInput, this.originalUserName);

                // Click save changes button
                const saveButton = await this.waitForElement(
                    By.xpath('//button[contains(text(), "שמור שינויים")]')
                );
                await saveButton.click();
                await this.driver.sleep(this.defaultDelay);

                console.log("User name reset to default successfully.");
            } else {
                console.log("User with specified email not found.");
            }
        } catch (error) {
            console.error("Failed to reset user name:", error);
        }
    }
}

// Run the test
(async () => {
    const test = new UserManagementTest();
    await test.init();
    await test.runTest();
})(); 
