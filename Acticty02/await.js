// node project02.js --url=https://hackerrank.com --config=config.json

// npm init -y
// npm i minimist
// npm i puppeteer

let minimist = require('minimist');
let puppeteer = require('puppeteer');
let fs = require('fs');

let args = minimist(process.argv);

let configJSON = fs.readFileSync(args.config, "utf-8");

let configJSO = JSON.parse(configJSON);




// async-await

(async function kuchbhi() {
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized'
        ]
    });

    let pages = await browser.pages();
    let page = pages[0];
    await page.goto(args.url);

    // wait for selector | click on first page ka login
    await page.waitForSelector("a[data-event-action='Login']");
    await page.click("a[data-event-action='Login']");

    // wait for selector | click on page 2 ka login 
    await page.waitForSelector("a[href='https://www.hackerrank.com/login']");
    await page.click("a[href='https://www.hackerrank.com/login']");

    // userid type
    await page.waitForSelector("input[name='username']");
    await page.type("input[name='username']", configJSO.userid, { delay: 100 });
    // password type
    await page.waitForSelector("input[name='password']");
    await page.type("input[name='password']", configJSO.password, { delay: 100 });

    // Login click
    await page.waitForSelector("button[data-analytics='LoginPassword']");
    await page.click("button[data-analytics='LoginPassword']");
    // compete click
    await page.waitForSelector("a[data-analytics='NavBarContests']");
    await page.click("a[data-analytics='NavBarContests']");
    // manage contest click
    await page.waitForSelector("a[href='/administration/contests/']");
    await page.click("a[href='/administration/contests/']");

    // save moderator in separate tab

    //find all urls of same page

    await page.waitForSelector("a.backbone.block-center");
    let curls = await page.$$eval("a.backbone.block-center", function (atags) {
        let urls = [];
        for (let i = 0; i < atags.length; i++) {
            let url = atags[i].getAttribute("href");
            urls.push(url);
        }
        return urls;
    });

    for (let i = 0; i < curls.length; i++) {
        let curl = curls[i];

        let ctab = await browser.newPage();
        await ctab.goto(args.url + curl);
        await ctab.bringToFront();
        await ctab.waitFor(3000);
        
        // click on moderator tab
        await ctab.waitForSelector("li[data-tab='moderators']");
        await ctab.click("li[data-tab='moderators']");
        await ctab.waitFor(3000);

        // add moderator
        await ctab.waitForSelector("input#moderator");
        await ctab.type("input#moderator", configJSO.moderator, { delay: 100 });
        await ctab.waitFor(3000);

        await ctab.keyboard.press("Enter");

        await ctab.waitFor(3000);

        await ctab.close();
    }
})();