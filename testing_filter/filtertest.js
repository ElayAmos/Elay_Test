const { Builder, By, until } = require('selenium-webdriver');

class InviteFilter {
    constructor() {
        this.driver = new Builder().forBrowser('chrome').build();
        this.baseUrl = 'https://dev.tevelhatal.com'; // Replace with your application's URL
        this.defaultDelay = 1000; // Adjust delay as needed for faster scrolling
    }

    async waitForElement(selector) {
        return await this.driver.wait(until.elementLocated(selector), this.defaultDelay);
    }

    async typeSlowly(element, text) {
        for (let char of text) {
            await element.sendKeys(char);
            await this.driver.sleep(100); // Adjust typing speed as needed
        }
    }

    async login() {
        console.log("Logging in to the application...");
        await this.driver.get(this.baseUrl);
        await this.driver.sleep(this.defaultDelay);

        // Maximize the Chrome window
        await this.driver.manage().window().maximize();

        const emailInput = await this.waitForElement(By.css('input[data-cy="email"]'));
        await this.typeSlowly(emailInput, 'omriAdmin@tevel.com');

        const passwordInput = await this.waitForElement(By.css('input[data-cy="password"]'));
        await this.typeSlowly(passwordInput, 'omriPass123');

        await (await this.waitForElement(By.css('button[data-cy="button-login"]'))).click();
        await this.driver.sleep(this.defaultDelay);
    }

    async setRecordsPerPage() {
        // Click on the records per page container
        const recordsContainer = await this.waitForElement(By.css('div[data-cy="pageSize"]'));
        await recordsContainer.click();
        await this.driver.sleep(this.defaultDelay);

        // Select the option for 100 records
        const hundredRecordsOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and text()='100 רשומות']"));
        await hundredRecordsOption.click();
        await this.driver.sleep(this.defaultDelay);
    }

    async filterUrgentInvites() {
        const incorrectOrders = {}; // Object to store orders that are not marked correctly by status
        const statuses = ['דחוף', 'סביר', 'בזמנים']; // Array of statuses to check

        try {
            await this.login();

            // Click on the "צפייה בהזמנות בחינה" button
            const viewInvitesButton = await this.waitForElement(By.xpath("//span[text()='צפייה בהזמנות בחינה']"));
            await viewInvitesButton.click();
            await this.driver.sleep(this.defaultDelay);

            // Filter by "סנן לפי שלוחות וארגונים"
            const filterSection = await this.driver.findElements(By.xpath("//div[contains(@class, 'mb-2') and .//label[text()='סנן לפי שלוחות וארגונים']]"));
            if (filterSection.length > 0) {
                console.log("Found the filtering section for 'סנן לפי שלוחות וארגונים'.");

                const treeselectContent = await this.waitForElement(By.xpath("//div[@data-cy='treeselect-content']"));
                await treeselectContent.click();
                await this.driver.sleep(this.defaultDelay);

                const options = ['נס"א', 'תמרון ותקיפה', 'לי״ד', 'מנת״ק'];
                for (let option of options) {
                    const optionElement = await this.waitForElement(By.xpath(`//div[@data-cy="option" and .//span[text()='${option}']]`));
                    await optionElement.click();
                    await this.driver.sleep(500);
                }
            } else {
                console.log("The filtering section for 'סינון לפי שלוחות וארגונים' was not found.");
            }

            // Filter by each status
            for (const status of statuses) {
                // Click on the status filter input to activate it
                const statusFilterInput = await this.waitForElement(By.xpath("//div[@data-cy='statusFilter']//input[@data-cy='search']"));
                await statusFilterInput.click();
                await this.driver.sleep(this.defaultDelay);

                // Select the status option
                const statusOption = await this.waitForElement(By.xpath(`//div[@data-cy='option' and text()='${status}']`));
                await statusOption.click();
                await this.driver.sleep(this.defaultDelay);

                // Click on "בחר את כל התאריכים"
                const allDatesOption = await this.waitForElement(By.css('div[data-cy="allDates"]'));
                await allDatesOption.click();
                await this.driver.sleep(this.defaultDelay);

                // Set the number of records to 100
                await this.setRecordsPerPage();

                // Scroll and check invite cards
                let lastHeight = await this.driver.executeScript("return document.body.scrollHeight");
                while (true) {
                    let invites = await this.driver.findElements(By.css('div[data-cy="infinite-card"]'));
                    for (let invite of invites) {
                        try {
                            const statusElement = await invite.findElement(By.xpath(".//div[contains(@class, 'w-fit') and contains(., 'זמני בחינה:')]"));
                            const statusText = await statusElement.getText();

                            const orderNumberElement = await invite.findElement(By.xpath(".//div[contains(text(), 'מספר הזמנה')]"));
                            const orderNumberText = await orderNumberElement.getText();

                            if (!statusText.includes(status)) {
                                console.warn(`Order ${orderNumberText} is not correctly marked as ${status}.`);
                                if (!incorrectOrders[status]) {
                                    incorrectOrders[status] = [];
                                }
                                incorrectOrders[status].push(orderNumberText); // Add to incorrect orders for this status
                            } else {
                                console.log(`Order ${orderNumberText} is correctly marked as ${status}.`);
                            }
                        } catch (err) {
                            console.error("Failed to process invite card:", err.message);
                        }
                    }

                    // Scroll down
                    await this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
                    await this.driver.sleep(2000);

                    // Check if scrolling is complete
                    let newHeight = await this.driver.executeScript("return document.body.scrollHeight");
                    if (newHeight === lastHeight) {
                        break;
                    }
                    lastHeight = newHeight;
                }

                // Scroll back to the top to select the next status
                await this.driver.executeScript("window.scrollTo(0, 0);");
                await this.driver.sleep(this.defaultDelay);
            }

            // Summary message for each status
            for (const status of statuses) {
                if (incorrectOrders[status] && incorrectOrders[status].length > 0) {
                    console.error(`The following orders in ${status} are not marked correctly according to their statuses: ${incorrectOrders[status].join(', ')}. The check failed.`);
                } else {
                    console.log(`All orders in ${status} are correctly marked. The check passed successfully.`);
                }
            }
        } catch (error) {
            console.error("The automation check failed:", error.message);
        }
    }

    async close() {
        await this.driver.quit();
    }
}

// Run the automation
(async () => {
    const inviteFilter = new InviteFilter();
    try {
        await inviteFilter.filterUrgentInvites();
    } finally {
        await inviteFilter.close();
    }
})(); 
