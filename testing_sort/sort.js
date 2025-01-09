const { Builder, By, until } = require('selenium-webdriver');

class InviteFilter {
    constructor() {
        // Initialize WebDriver and configuration
        this.driver = new Builder().forBrowser('chrome').build();
        this.baseUrl = 'https://dev.tevelhatal.com';
        this.defaultDelay = 1000; // Default delay in milliseconds
    }

    async waitForElement(selector) {
        // Wait for an element to be present on the page
        return await this.driver.wait(until.elementLocated(selector), this.defaultDelay);
    }

    async typeSlowly(element, text) {
        // Type text character by character with a delay to simulate human typing
        for (let char of text) {
            await element.sendKeys(char);
            await this.driver.sleep(100);
        }
    }

    async login() {
        // Log in to the application
        console.log("Logging in to the application...");
        await this.driver.get(this.baseUrl);
        await this.driver.sleep(this.defaultDelay);

        // Maximize browser window
        await this.driver.manage().window().maximize();

        // Enter email
        const emailInput = await this.waitForElement(By.css('input[data-cy="email"]'));
        await this.typeSlowly(emailInput, 'omriAdmin@tevel.com');

        // Enter password
        const passwordInput = await this.waitForElement(By.css('input[data-cy="password"]'));
        await this.typeSlowly(passwordInput, 'omriPass123');

        // Click login button
        await (await this.waitForElement(By.css('button[data-cy="button-login"]'))).click();
        await this.driver.sleep(this.defaultDelay);
    }

    async viewExamOrders() {
        // Navigate to exam orders page
        console.log("Navigating to exam orders...");
        const viewInvitesButton = await this.waitForElement(By.xpath("//span[text()='צפייה בהזמנות בחינה']"));
        await viewInvitesButton.click();
        await this.driver.sleep(this.defaultDelay);
    }

    async filterByOrganization() {
        // Filter orders by organization
        console.log("Filtering by organization...");
        const filterSection = await this.driver.findElements(By.xpath("//div[contains(@class, 'mb-2') and .//label[text()='סנן לפי שלוחות וארגונים']]"));
        
        if (filterSection.length > 0) {
            // Open the organization filter dropdown
            const treeselectContent = await this.waitForElement(By.xpath("//div[@data-cy='treeselect-content']"));
            await treeselectContent.click();
            await this.driver.sleep(this.defaultDelay);

            // Select multiple organizations
            const options = ['נס"א', 'תמרון ותקיפה', 'לי״ד', 'מנת״ק'];
            for (let option of options) {
                const optionElement = await this.waitForElement(By.xpath(`//div[@data-cy="option" and .//span[text()='${option}']]`));
                await optionElement.click();
                await this.driver.sleep(500);
            }
        } else {
            console.log("The filtering section for 'סינון לפי שלוחות וארגונים' was not found.");
        }
    }

    async setRecordsPerPage() {
        // Set the number of records displayed per page and date range
        const recordsContainer = await this.waitForElement(By.css('div[data-cy="pageSize"]'));
        await recordsContainer.click();
        await this.driver.sleep(this.defaultDelay);

        // Select 100 records per page
        const hundredRecordsOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and text()='100 רשומות']"));
        await hundredRecordsOption.click();
        await this.driver.sleep(this.defaultDelay);

        // Select all dates option
        const allDatesOption = await this.waitForElement(By.css('div[data-cy="allDates"]'));
        await allDatesOption.click();
        await this.driver.sleep(this.defaultDelay);
    }

    async scrollToTop() {
        // Scroll the page back to the top
        console.log("Scrolling back to top...");
        await this.driver.executeScript("window.scrollTo(0, 0)");
        await this.driver.sleep(1000); // Wait for scroll to complete
        console.log("Scrolled to top successfully.");
    }

    async selectSortingOptions() {
        // Test both sorting options: newest to oldest and oldest to newest
        const sortingOptions = ['מהחדש ביותר', 'מהישן ביותר'];

        for (const option of sortingOptions) {
            console.log(`\n=== Testing sorting option: ${option} ===`);

            // Scroll to top before changing sort option
            await this.scrollToTop();
            await this.driver.sleep(this.defaultDelay);

            // Click sort field and select option
            const sortField = await this.waitForElement(By.xpath("//input[@data-cy='search' and @placeholder='מהחדש ביותר']"));
            await sortField.click();
            await this.driver.sleep(this.defaultDelay);

            const sortingOptionElement = await this.waitForElement(By.xpath(`//div[@data-cy='option' and text()='${option}']`));
            await sortingOptionElement.click();
            await this.driver.sleep(this.defaultDelay);

            // Verify sorting order
            await this.verifySortingAndOrderNumbers(option);
        }
    }

    async verifySortingAndOrderNumbers(option) {
        await this.scrollAllOrders();

        // Get all invite cards from the page
        const invites = await this.driver.findElements(By.css('div[data-cy="infinite-card"]'));
        const inviteDetails = [];
        const problematicOrders = {
            dateMismatch: [], // Orders that are not in correct sort order
            missingDate: [],  // Orders with missing date information
            invalidDate: []   // Orders with invalid date format
        };

        console.log(`\nAnalyzing ${invites.length} orders...`);

        for (let invite of invites) {
            try {
                // Find the container element that holds both order number and date
                const containerElement = await invite.findElement(
                    By.css('div.flex.flex-wrap.mb-2.items-center')
                );

                // Extract the full order number (e.g., "25INV00168")
                const orderNumberElement = await containerElement.findElement(
                    By.css('div.font-bold.text-2xl.text-gray-600')
                );
                const orderNumberText = await orderNumberElement.getText();
                const orderNumber = orderNumberText.replace('מספר הזמנה:', '').trim();

                // Extract the date from the w-fit div
                const dateElement = await containerElement.findElement(
                    By.css('div.w-fit')
                );
                const dateText = await dateElement.getText();

                // Parse the date from Israeli format (DD/MM/YYYY) to Date object
                const [day, month, year] = dateText.split('/');
                const parsedDate = new Date(year, month - 1, day);

                // Validate the date
                if (isNaN(parsedDate.getTime())) {
                    problematicOrders.invalidDate.push(orderNumber);
                    console.log(`WARNING: Invalid date format for order ${orderNumber}: ${dateText}`);
                    continue;
                }

                inviteDetails.push({
                    date: parsedDate,
                    orderNumber: orderNumber,
                    rawDate: dateText
                });

            } catch (err) {
                const orderNum = await this.extractOrderNumber(invite);
                if (err.name === 'NoSuchElementError') {
                    problematicOrders.missingDate.push(orderNum);
                    console.log(`WARNING: Missing date for order ${orderNum}`);
                } else {
                    console.error(`ERROR: Failed to process invite: ${err.message}`);
                }
            }
        }

        // Sort the orders based on the selected option
        console.log('\nValidating sort order...');
        const sorted = [...inviteDetails].sort((a, b) => {
            if (option === 'מהחדש ביותר') { // Newest to oldest
                return b.date.getTime() - a.date.getTime();
            } else { // Oldest to newest
                return a.date.getTime() - b.date.getTime();
            }
        });

        // Check for sorting errors
        let hasErrors = false;
        for (let i = 0; i < inviteDetails.length; i++) {
            if (inviteDetails[i].date.getTime() !== sorted[i].date.getTime()) {
                hasErrors = true;
                problematicOrders.dateMismatch.push({
                    orderNumber: inviteDetails[i].orderNumber,
                    currentDate: inviteDetails[i].rawDate,
                    expectedDate: sorted[i].rawDate,
                    sortOption: option
                });
            }
        }

        // Print validation report
        console.log('\n=== Validation Summary ===');
        console.log(`Total orders analyzed: ${invites.length}`);
        console.log(`Orders with valid dates: ${inviteDetails.length}`);
        console.log(`Sort option: ${option}`);
        
        if (problematicOrders.dateMismatch.length > 0) {
            console.log('\nOrders with incorrect sort position:');
            problematicOrders.dateMismatch.forEach(mismatch => {
                console.log(`Order ${mismatch.orderNumber}: Current date ${mismatch.currentDate}, Expected date ${mismatch.expectedDate}`);
            });
        }
        
        if (problematicOrders.missingDate.length > 0) {
            console.log('\nOrders with missing dates:');
            console.log(problematicOrders.missingDate.join(', '));
        }
        
        if (problematicOrders.invalidDate.length > 0) {
            console.log('\nOrders with invalid date format:');
            console.log(problematicOrders.invalidDate.join(', '));
        }

        if (!hasErrors) {
            console.log(`\nSuccess! All orders are correctly sorted for option "${option}"`);
        }

        console.log('\nAnalysis completed.');
    }

    async extractOrderNumber(invite) {
        // Extract order number from invite card
        try {
            const orderNumberElement = await invite.findElement(
                By.css('div.font-bold.text-2xl.text-gray-600')
            );
            const orderNumberText = await orderNumberElement.getText();
            return orderNumberText.replace('מספר הזמנה:', '').trim();
        } catch (err) {
            return 'Unknown';
        }
    }

    async scrollAllOrders() {
        // Scroll through all orders to load them
        console.log("Scrolling through all invites...");

        let lastHeight = 0;
        while (true) {
            const currentHeight = await this.driver.executeScript("return document.body.scrollHeight");

            if (currentHeight === lastHeight) {
                break;
            }

            await this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight)");
            await this.driver.sleep(1000);
            lastHeight = currentHeight;
        }

        console.log("Finished scrolling.");
    }

    async close() {
        // Close the browser
        await this.driver.quit();
    }
}

// Main execution
(async () => {
    const inviteFilter = new InviteFilter();
    try {
        await inviteFilter.login();
        await inviteFilter.viewExamOrders();
        await inviteFilter.filterByOrganization();
        await inviteFilter.setRecordsPerPage();
        await inviteFilter.selectSortingOptions();
    } catch (error) {
        console.error('Test execution error:', error);
    } finally {
        await inviteFilter.close();
    }
})();
