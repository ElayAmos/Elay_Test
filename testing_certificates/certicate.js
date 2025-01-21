const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');

class CertificateAutomation {
    constructor() {
        this.driver = new Builder().forBrowser('chrome').build();
        this.baseUrl = 'https://dev.tevelhatal.com';
        this.defaultDelay = 1000; // Reduced default delay time for faster execution
        this.testResults = {
            successfulExamTypes: [],
            failedExamTypes: {},
            mismatches: {}
        };
    }

    async waitForElement(selector) {
        return await this.driver.wait(until.elementLocated(selector), 5000); // Wait up to 5 seconds
    }

    async waitForElementToBeVisible(selector) {
        return await this.driver.wait(until.elementIsVisible(selector), 5000); // Wait until the element is visible
    }

    async typeSlowly(element, text) {
        for (const char of text) {
            await element.sendKeys(char);
            await this.driver.sleep(50); // Short delay between each character
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

        // Ensure we navigate to the 'View Exam Certificates' page after login
        await this.viewExamCertificates();

        // Call the new function after login
        await this.filterByOrganizations();
        await this.filterByExamType();
    }

    async viewExamCertificates() {
        // Navigate to exam certificates page
        console.log("Navigating to exam certificates...");
        const viewCertificatesButton = await this.waitForElement(By.xpath("//span[text()='צפייה בתעודות בחינה']"));
        await viewCertificatesButton.click();
        await this.driver.sleep(this.defaultDelay);
    }

    async filterByOrganizations() {
        // Filter certificates by organizations
        console.log("Filtering by organizations...");
        const filterSection = await this.driver.findElements(By.xpath("//div[contains(@class, 'flex flex-col max-w-84') and .//label[text()='ארגונים']]"));
        
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
                await this.driver.sleep(200); // Reduced delay for organization selection
            }
        } else {
            console.log("The filtering section for 'ארגונים' was not found.");
        }
    }

    async filterByExamType() {
        // Filter certificates by exam type
        console.log("Filtering by exam type...");
        const examTypes = ['סדרתית', 'ראש סדרה/בק"מ', 'אימות', 'הכשרות', 'מימוש אחריות'];

        for (let examType of examTypes) {
            console.log(`בודק סוג בחינה: ${examType}`);
            
            // Select exam type from dropdown
            const examTypeDropdown = await this.waitForElement(By.xpath("//div[@data-cy='certificationTypeId']"));
            await examTypeDropdown.click();
            await this.driver.sleep(200); // Reduced delay for dropdown selection

            const examTypeOption = await this.waitForElement(By.xpath(`//div[@data-cy="option" and text()='${examType}']`));
            await examTypeOption.click();
            await this.driver.sleep(this.defaultDelay);

            // Check all certificates for this exam type
            await this.checkCertificateSorting(examType);
            
            console.log(`סיום בדיקה עבור סוג בחינה: ${examType}`);
        }

        // Save results to JSON file after all exam types have been checked
        this.saveResultsToFile();
    }

    async checkCertificateSorting(selectedExamType) {
        console.log(`בודק התאמה עבור סוג בחינה: ${selectedExamType}`);
        await this.driver.sleep(this.defaultDelay);

        let incorrectOrders = {};
        let processedCertificates = new Set(); // Keep track of processed certificates
        let hasMoreCertificates = true;
        let currentIndex = 0;

        while (hasMoreCertificates) {
            try {
                // Get all visible certificates
                const certificates = await this.driver.findElements(By.css('div[data-cy="infinite-card"]'));
                
                if (certificates.length === 0) {
                    console.log(`לא נמצאו תעודות נוספות לבדיקה עבור סוג המיון: ${selectedExamType}`);
                    hasMoreCertificates = false; // No more certificates to check
                    break;
                }

                // Get the current certificate
                const currentCertificate = certificates[currentIndex];
                
                // Get certificate number
                const certificateNumberElement = await currentCertificate.findElement(
                    By.css('div.font-bold.text-2xl.text-gray-600')
                );
                const certificateNumberText = await certificateNumberElement.getText();
                const certificateNumber = certificateNumberText.split(':')[1].trim();

                // Skip if we've already processed this certificate
                if (processedCertificates.has(certificateNumber)) {
                    currentIndex++;
                    continue;
                }

                console.log(`בודק תעודה מספר: ${certificateNumber}`);

                // Scroll certificate into view if needed
                await this.driver.executeScript(
                    "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});",
                    currentCertificate
                );
                await this.driver.sleep(500); // Reduced delay for scrolling

                // Find and click the view button
                const viewButton = await currentCertificate.findElement(
                    By.xpath(".//span[@data-cy='action-1']//a")
                );
                
                if (viewButton) {
                    await viewButton.click();
                    await this.driver.sleep(this.defaultDelay);

                    try {
                        // Check exam type in the details view
                        const examTypeContainer = await this.waitForElement(
                            By.xpath("//div[contains(@class, 'border-b') and .//span[text()='סוג בחינה']]")
                        );
                        const examTypeText = await examTypeContainer.findElement(By.css('span.mr')).getText();

                        if (examTypeText === selectedExamType) {
                            console.log(`✅ תעודה ${certificateNumber}: המיון תקין`);
                        } else {
                            console.log(`❌ תעודה ${certificateNumber}: המיון לא תקין!`);
                            if (!incorrectOrders[selectedExamType]) {
                                incorrectOrders[selectedExamType] = [];
                            }
                            incorrectOrders[selectedExamType].push(certificateNumber);
                        }

                    } catch (error) {
                        console.error(`שגיאה בבדיקת סוג בחינה בתעודה ${certificateNumber}:`, error.message);
                    }

                    // Navigate back to certificates list
                    await this.driver.navigate().back();
                    await this.driver.sleep(this.defaultDelay);

                    // Mark this certificate as processed
                    processedCertificates.add(certificateNumber);
                }

                // Move to next certificate
                currentIndex++;

                // If we've checked all visible certificates, scroll to load more
                if (currentIndex >= certificates.length) {
                    const lastCertificate = certificates[certificates.length - 1];
                    await this.driver.executeScript(
                        "arguments[0].scrollIntoView({behavior: 'smooth', block: 'end'});",
                        lastCertificate
                    );
                    await this.driver.sleep(1000);

                    // Reset index for new batch of certificates
                    currentIndex = 0;

                    // Check if we've reached the bottom of the page
                    const totalHeight = await this.driver.executeScript("return document.documentElement.scrollHeight");
                    const currentScroll = await this.driver.executeScript("return window.pageYOffset + window.innerHeight");
                    
                    if (currentScroll >= totalHeight - 10) { // Adding small threshold
                        hasMoreCertificates = false;
                    }
                }

            } catch (error) {
                if (error.name === 'StaleElementReferenceError') {
                    hasMoreCertificates = false; // Stop checking if stale element reference occurs
                } else {
                    console.error("שגיאה בבדיקת התעודות:", error.message);
                    hasMoreCertificates = false;
                }
            }
        }

        // Scroll back to top after finishing the check
        await this.driver.executeScript("window.scrollTo(0, 0);");
        await this.driver.sleep(this.defaultDelay);

        // Print summary of incorrect certificates
        console.log(`הבדיקה עבור סוג המיון ${selectedExamType} הסתיימה.`);
        if (Object.keys(incorrectOrders).length > 0) {
            console.log("\nסיכום תעודות שגויות:");
            for (let type in incorrectOrders) {
                console.log(`\nסוג בחינה ${type}:`);
                console.log(`נמצאו ${incorrectOrders[type].length} תעודות שגויות:`);
                incorrectOrders[type].forEach(cert => console.log(`- ${cert}`));
            }
        } else {
            console.log("\n✅ כל התעודות תקינות!");
        }

        // Store results for later saving
        this.testResults.mismatches[selectedExamType] = incorrectOrders;
        if (Object.keys(incorrectOrders).length > 0) {
            this.testResults.failedExamTypes[selectedExamType] = true;
        } else {
            this.testResults.successfulExamTypes.push(selectedExamType);
        }
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
}

(async () => {
    const automation = new CertificateAutomation();
    try {
        await automation.login();
    } catch (error) {
        console.error("An error occurred during automation:", error);
    } finally {
        // Close the browser after the test or in case of failure
        await automation.driver.quit();
      
    }
})();
