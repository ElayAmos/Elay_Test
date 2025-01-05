const { Builder, By, until, Key } = require('selenium-webdriver');
const assert = require('assert');

class ManagerReportsAutomation {
    constructor() {
        this.driver = null;
        this.baseUrl = 'https://dev.tevelhatal.com'; // Replace with the actual URL
        this.timeout = 20000;
        this.defaultDelay = 1500; // Default delay between actions
        this.typeDelay = 100; // Delay between keystrokes when typing
    }

    async init() {
        this.driver = await new Builder().forBrowser('chrome').build();
        await this.driver.manage().window().maximize();
        await this.driver.sleep(this.defaultDelay);
    }

    async waitForElement(selector, timeout = this.timeout) {
        const element = await this.driver.wait(until.elementLocated(selector), timeout);
        await this.driver.wait(until.elementIsVisible(element), timeout);
        await this.driver.sleep(500); // Short pause after finding element
        return element;
    }

    async typeSlowly(element, text) {
        for (const char of text) {
            await element.sendKeys(char);
            await this.driver.sleep(this.typeDelay);
        }
        await this.driver.sleep(500);
    }

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

    async generateReports() {
        // Get the current date
        const today = new Date();

        // Set end date to today's date
        let endDate = new Date(today); // End date - today's date
        let startDate = new Date(today); // Start date - today's date

        // Loop until the start date reaches January 1, 2022
        while (startDate >= new Date('2022-01-01')) {
            // Format the start date as YYYY-MM-DD
            const formattedStartDate = startDate.toISOString().split('T')[0];
            console.log(`Generating report for date: ${formattedStartDate}`);

            // Navigate to the reports page
            await this.driver.get(`${this.baseUrl}/Managements/Reports`);
            await this.driver.sleep(this.defaultDelay);

            // Select report type
            const reportTypeInput = await this.waitForElement(By.css('input[data-cy="search"]'));
            await reportTypeInput.click();
            await this.driver.sleep(this.defaultDelay);

            // Type the name of the report "Rejection Rates" (in Hebrew)
            await this.typeSlowly(reportTypeInput, 'אחוזי דחייה');
            await this.driver.sleep(this.defaultDelay);

            // Select the specific report option
            const rejectionRateOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and contains(text(), 'דוח אחוזי דחייה')]"));
            await rejectionRateOption.click();
            await this.driver.sleep(this.defaultDelay);

            // Select "All Suppliers" option
            const allSuppliersButton = await this.waitForElement(By.xpath("//button[contains(text(), 'כל הספקים')]"));
            await allSuppliersButton.click();
            await this.driver.sleep(this.defaultDelay);

            // Select branch "Maneuver and Attack" (in Hebrew)
            const branchInput = await this.waitForElement(By.css('div[data-cy="treeselect-content"]'));
            await branchInput.click();
            await this.driver.sleep(this.defaultDelay);

            const maneuverOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and contains(span, 'תמרון ותקיפה')]"));
            await maneuverOption.click();
            await this.driver.sleep(this.defaultDelay);

            // Enter start date by clicking on the date picker
            const startDateInput = await this.waitForElement(By.css('input[data-cy="datetimepicker"]'));
            await startDateInput.click(); // Click to open the date picker
            await this.driver.sleep(this.defaultDelay);

            // Select the current date from the calendar
            const currentDate = startDate.getDate(); // Use startDate instead of today
            const currentMonth = startDate.getMonth() + 1; // Get the month (0-indexed)
            const currentYear = startDate.getFullYear(); // Get the year

            // Click on the current date in the calendar
            const currentDateOption = await this.waitForElement(By.xpath(`//div[@role='calendar-day-${currentDate}']`));
            await currentDateOption.click(); // Click on the current date
            await this.driver.sleep(this.defaultDelay);

            // Enter end date by clicking on the date picker
            const endDateInput = await this.waitForElement(By.css('input[data-cy="datetimepicker"][name="endDate"]'));
            await endDateInput.click(); // Click to open the date picker
            await this.driver.sleep(this.defaultDelay);

            // Select the current date from the calendar for end date
            const currentDate2 = endDate.getDate(); // Use endDate instead of today
            const currentDate2Option = await this.waitForElement(By.xpath(`//div[@role='calendar-day-${currentDate2}']`));
            await currentDate2Option.click(); // Click on the current date
            await this.driver.sleep(this.defaultDelay);

            // Select file type as PDF
            const fileTypeLabel = await this.waitForElement(By.xpath("//span[contains(text(), 'סוג קובץ')]"));
            const fileTypeInput = await fileTypeLabel.findElement(By.xpath("following::input[@role='search'][1]"));
            await fileTypeInput.click();
            await this.driver.sleep(this.defaultDelay);

            const pdfOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and contains(text(), 'PDF')]"));
            await pdfOption.click();
            await this.driver.sleep(this.defaultDelay);

            // Click the "Generate Report" button
            const generateButton = await this.waitForElement(By.css('button[data-cy="button-undefined"]'));
            await generateButton.click();
            await this.driver.sleep(this.defaultDelay);

            // Check for errors during report generation
            const errorMessage = await this.driver.findElements(By.css('.error-message')); // Adjust selector if necessary
            if (errorMessage.length > 0) {
                console.error(`Error found for date ${formattedStartDate}:`, await errorMessage[0].getText());
            } else {
                console.log(`Report generated successfully for date ${formattedStartDate}.`);
            }

            // Move to the previous day
            startDate.setDate(startDate.getDate() - 1);
        }
    }

    async run() {
        try {
            await this.init();
            await this.login();
            await this.generateReports();
        } catch (error) {
            console.error("Automation failed:", error);
        } finally {
            await this.driver.quit();
        }
    }
}

// Run the automation
(async () => {
    const automation = new ManagerReportsAutomation();
    await automation.run();
})();