const { Builder, By, until, Key } = require('selenium-webdriver');
const assert = require('assert');

class ManagerReportsAutomation {
    constructor() {
        this.driver = null;
        this.baseUrl = 'https://dev.tevelhatal.com'; // Replace with the actual URL
        this.timeout = 20000;
        this.defaultDelay = 500; // Delay for initial actions
        this.typeDelay = 50; // Delay between keystrokes when typing
        this.months = [
            'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
        ]; // Array of month names in Hebrew
    }

    async init() {
        this.driver = await new Builder().forBrowser('chrome').build();
        await this.driver.manage().window().maximize();
        await this.driver.sleep(this.defaultDelay);
    }

    async waitForElement(selector, timeout = this.timeout) {
        const element = await this.driver.wait(until.elementLocated(selector), timeout);
        await this.driver.wait(until.elementIsVisible(element), timeout);
        return element;
    }

    async typeSlowly(element, text) {
        for (const char of text) {
            await element.sendKeys(char);
            await this.driver.sleep(this.typeDelay);
        }
    }

    async login() {
        console.log("Logging in to the application...");
        await this.driver.get(this.baseUrl);
        await this.driver.sleep(this.defaultDelay);

        const emailInput = await this.waitForElement(By.css('input[data-cy="email"]'));
        await this.typeSlowly(emailInput, 'omriAdmin@tevel.com');

        const passwordInput = await this.waitForElement(By.css('input[data-cy="password"]'));
        await this.typeSlowly(passwordInput, 'omriPass123');

        await (await this.waitForElement(By.css('button[data-cy="button-login"]'))).click();
        await this.driver.sleep(this.defaultDelay);
    }

    async generateReports() {
        const today = new Date();
        let endDate = new Date(today);
        let startDate = new Date(today);

        while (startDate >= new Date('2022-01-01')) {
            const formattedStartDate = startDate.toISOString().split('T')[0];
            console.log(`Generating report for date: ${formattedStartDate}`);

            await this.driver.get(`${this.baseUrl}/Managements/Reports`);
            await this.driver.sleep(this.defaultDelay);

            const reportTypeInput = await this.waitForElement(By.css('input[data-cy="search"]'));
            await reportTypeInput.click();
            await this.typeSlowly(reportTypeInput, 'אחוזי דחייה');

            const rejectionRateOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and contains(text(), 'דוח אחוזי דחייה')]"));
            await rejectionRateOption.click();

            const allSuppliersButton = await this.waitForElement(By.xpath("//button[contains(text(), 'כל הספקים')]"));
            await allSuppliersButton.click();

            const branchInput = await this.waitForElement(By.css('div[data-cy="treeselect-content"]'));
            await branchInput.click();

            const maneuverOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and contains(span, 'תמרון ותקיפה')]"));
            await maneuverOption.click();

            const startDateInput = await this.waitForElement(By.css('input[data-cy="datetimepicker"]'));
            await startDateInput.click();

            const currentDate = startDate.getDate();
            const currentMonth = startDate.getMonth() + 1;

            let monthFound = false;
            while (!monthFound) {
                const currentMonthText = await this.driver.findElement(By.css('span.font-bold.cursor-pointer')).getText();
                if (currentMonthText.includes(this.months[currentMonth - 1]) && startDate.getFullYear() === parseInt(currentMonthText.split(' ')[1])) {
                    monthFound = true;
                } else {
                    const backArrow = await this.waitForElement(By.xpath("//img[@alt='arrowBack']"));
                    await backArrow.click();
                    await this.driver.sleep(this.defaultDelay);
                }
            }

            // Select the current date, ensuring it's the correct month
            const currentDateOption = await this.driver.findElement(By.xpath(`//div[@role='calendar-day-${currentDate}' and not(contains(@class, 'disabled'))]`));
            await currentDateOption.click();

            const endDateInput = await this.waitForElement(By.css('input[data-cy="datetimepicker"][name="endDate"]'));
            await endDateInput.click();

            const currentDate2 = endDate.getDate();
            const currentDate2Option = await this.driver.findElement(By.xpath(`//div[@role='calendar-day-${currentDate2}' and not(contains(@class, 'disabled'))]`));
            await currentDate2Option.click();

            const fileTypeLabel = await this.waitForElement(By.xpath("//span[contains(text(), 'סוג קובץ')]"));
            const fileTypeInput = await fileTypeLabel.findElement(By.xpath("following::input[@role='search'][1]"));
            await fileTypeInput.click();

            const pdfOption = await this.waitForElement(By.xpath("//div[@data-cy='option' and contains(text(), 'PDF')]"));
            await pdfOption.click();

            const generateButton = await this.waitForElement(By.css('button[data-cy="button-undefined"]'));
            await generateButton.click();

            const errorMessage = await this.driver.findElements(By.css('.error-message'));
            if (errorMessage.length > 0) {
                console.error(`Error found for date ${formattedStartDate}:`, await errorMessage[0].getText());
            } else {
                console.log(`Report generated successfully for date ${formattedStartDate}.`);
            }

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
