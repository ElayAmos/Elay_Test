const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');

class Usersort {
    constructor() {
        this.driver = new Builder().forBrowser('chrome').build();
        this.baseUrl = 'https://dev.tevelhatal.com';
        this.defaultDelay = 1000;
        this.testResults = {
            successfulFilters: [],
            failedFilters: {},
            mismatches: {}
        };
    }

    async waitForElement(selector) {
        return await this.driver.wait(until.elementLocated(selector), this.defaultDelay);
    }

    async typeSlowly(element, text) {
        for (let char of text) {
            await element.sendKeys(char);
            await this.driver.sleep(100);
        }
    }

    async login() {
        console.log("Logging in to the application...");
        await this.driver.get(this.baseUrl);
        await this.driver.sleep(this.defaultDelay);

        await this.driver.manage().window().maximize();
        const emailInput = await this.waitForElement(By.css('input[data-cy="email"]'));
        await this.typeSlowly(emailInput, 'omriAdmin@tevel.com');
        const passwordInput = await this.waitForElement(By.css('input[data-cy="password"]'));
        await this.typeSlowly(passwordInput, 'omriPass123');
        const loginButton = await this.waitForElement(By.css('button[data-cy="button-login"]'));
        await loginButton.click();
        await this.driver.sleep(this.defaultDelay);
    }

    async verifyGroupFilter() {
        try {
            console.log("Starting group filter verification...");
            
            const options = ['אחר', 'בוחני חוץ', 'בוחני מיקור חוץ', 'בוחני צה"ל', 'בוחנים משימתיים', 'מנת"ק', 'מש"א', 'משתמשי מרכז בקרה', 'ספקים', 'צופים', 'רפ"ט'];

            for (let group of options) {
                console.log(`Testing filter: ${group}`);
                let hasFilterErrors = false;
                this.testResults.mismatches[group] = {};

                const groupFilterLabel = await this.waitForElement(By.xpath('//label[contains(text(), "סינון לפי קבוצה")]'));
                await groupFilterLabel.click();
                await this.driver.sleep(500);

                const groupFilterInput = await this.waitForElement(By.css('div[data-cy="groupFilter"] input'));
                await groupFilterInput.click();
                await this.driver.sleep(500);

                const parts = group.split('"');
                const xpathExpression = parts.map((part, index) => {
                    return index % 2 === 0 ? `contains(text(), "${part}")` : `contains(text(), '"')`;
                }).join(' and ');

                const groupOption = await this.waitForElement(By.xpath(`//div[@data-cy="option" and ${xpathExpression}]`));
                await groupOption.click();
                await this.driver.sleep(1000);

                let hasMoreItems = true;
                let previousHeight = 0;

                while (hasMoreItems) {
                    const cards = await this.driver.findElements(By.css('[data-cy="infinite-card"]'));
                    
                    for (let card of cards) {
                        try {
                            const groupElement = await card.findElement(
                                By.xpath('.//div[contains(text(), "קבוצה")]/following-sibling::div')
                            );
                            const groupText = await groupElement.getText();
                            
                            const nameElement = await card.findElement(
                                By.css('.font-bold.text-2xl.text-gray-600')
                            );
                            const nameText = await nameElement.getText();

                            if (groupText !== group) {
                                hasFilterErrors = true;
                                if (!this.testResults.mismatches[group][groupText]) {
                                    this.testResults.mismatches[group][groupText] = [];
                                }
                                this.testResults.mismatches[group][groupText].push(nameText);
                                console.error(
                                    `Mismatch found: User "${nameText}" belongs to group "${groupText}" ` +
                                    `but current filter is "${group}"`
                                );
                            }
                        } catch (error) {
                            console.error('Error checking card:', error);
                        }
                    }

                    await this.driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                    await this.driver.sleep(1000);

                    const currentHeight = await this.driver.executeScript('return document.body.scrollHeight');
                    if (currentHeight === previousHeight) {
                        hasMoreItems = false;
                    }
                    previousHeight = currentHeight;
                }

                if (hasFilterErrors) {
                    this.testResults.failedFilters[group] = true;
                } else {
                    this.testResults.successfulFilters.push(group);
                }

                await this.driver.executeScript('window.scrollTo(0, 0)');
                await this.driver.sleep(500);
            }
            
            this.generateSummaryReport();
            
        } catch (error) {
            console.error('Error in group filter verification:', error);
        }
    }

    generateSummaryReport() {
        console.log('\n=== סיכום תוצאות הבדיקה ===\n');

        console.log('פילטרים שעברו בהצלחה:');
        this.testResults.successfulFilters.forEach(filter => {
            console.log(`✅ ${filter}`);
        });

        console.log('\nפילטרים שנכשלו:');
        for (const [filter, mismatches] of Object.entries(this.testResults.mismatches)) {
            if (Object.keys(mismatches).length > 0) {
                console.log(`\n❌ ${filter}:`);
                for (const [wrongGroup, users] of Object.entries(mismatches)) {
                    console.log(`  משתמשים שנמצאו בקבוצה "${wrongGroup}":`);
                    users.forEach(user => {
                        console.log(`    - ${user}`);
                    });
                }
            }
        }

        console.log('\nסטטיסטיקה:');
        console.log(`סה"כ פילטרים שנבדקו: ${this.testResults.successfulFilters.length + Object.keys(this.testResults.failedFilters).length}`);
        console.log(`פילטרים שעברו בהצלחה: ${this.testResults.successfulFilters.length}`);
        console.log(`פילטרים שנכשלו: ${Object.keys(this.testResults.failedFilters).length}`);

        this.saveResultsToFile();
    }

    async saveResultsToFile() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(__dirname, `test-results-${timestamp}.json`);
        
        const results = {
            timestamp: new Date().toISOString(),
            results: this.testResults
        };

        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\nתוצאות מפורטות נשמרו בקובץ: ${filename}`);
    }

    async runTest() {
        try {
            console.log("Starting test execution...");
            await this.login();

            console.log("Navigating to user management...");
            const userManagementLink = await this.waitForElement(By.xpath('//a[contains(text(), "ניהול משתמשים")]'));
            await userManagementLink.click();
            await this.driver.sleep(this.defaultDelay);

            await this.verifyGroupFilter();

            console.log("Test completed successfully!");
        } catch (error) {
            console.error("Test failed:", error);
        }
    }

    async close() {
        if (this.driver) {
            await this.driver.quit();
        }
    }
}

// Main Execution
(async () => {
    const userSort = new Usersort();
    try {
        await userSort.runTest();
    } finally {
        await userSort.close();
    }
})();
