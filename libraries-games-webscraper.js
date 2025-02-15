const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const { convertArrayToCSV } = require('convert-array-to-csv');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeLibraryGamesListWithScoresAndDuration() {
    const steamId = 'your-steam-id';
    const browser = await puppeteer.connect({
        headless: false, 
        browserWSEndpoint: 
        'ws://127.0.0.1:9222/devtools/browser/b1e0ede6-81de-40fd-a0be-4ea6999e6d88',
        defaultViewport: false,
        protocolTimeout: 0
    });
    const page = await browser.newPage();
    let listGamesDurationArray = [];
    await page.goto(`https://steamcommunity.com/id/${steamId}/games/?tab=all`, {waitUntil: "networkidle0"});
    await page.waitForSelector('._22awlPiAoaZjQMqxJhp-KP');
    const mySteamGames = await page.$$eval('._22awlPiAoaZjQMqxJhp-KP', option => option.map(item => item.innerText));

    for (const game of mySteamGames) {
        let error = null;
        let duration = '--';
        await page.goto(`https://howlongtobeat.com/?q=${game.replaceAll(' ', '%2520')}`, {waitUntil: "load"});
        try {
            await page.waitForSelector('h3.SearchOptions_search_title__83U9o', { timeout: 5_000 });
        } catch (e) {
            error = e;
            continue;
        }
        if (!error) {
            duration = await page.evaluate(el => {
                return document
                .querySelector('ul > li:first-child > div > div.GameCard_search_list_details__yJrue > div.GameCard_search_list_details_block__XEXkr > div > div:nth-child(2)')
                ?.textContent;
            });
        }        
        await page.goto(`https://www.metacritic.com/search/${game.replaceAll(' ', '%20')}/?page=1&category=13`, {waitUntil: "load"});
        await page.waitForSelector('div.c-productSubpageNavigation', { timeout: 5_000 });
        const metacriticScore = await page.evaluate(el => {
            return document.querySelector('div.c-pageSiteSearch-results > div:nth-child(2) > div > a > div:nth-child(3) > div > div > span')?.textContent;
        });
        const durationParsed = duration?.trim().includes('Mins')
            ? `${+(duration?.trim()?.replaceAll('½', ',5')?.replaceAll(' Mins', ''))/60}`.replaceAll('.', ',')
            : duration?.trim()?.replaceAll('½', ',5')?.replaceAll(' Hours', '');
        listGamesDurationArray.push({
            title: game,
            duration: durationParsed,
            metacriticScore: metacriticScore || 'No encontrada',
            library: 'Steam',
            ratio: isNaN(metacriticScore) || isNaN(durationParsed) || !metacriticScore || !durationParsed
                ? '--'
                : `${+metacriticScore/+durationParsed}`.replaceAll('.', ','),
            valorationAfterPlayed: '',
            played: false
        });
    }

    await page.goto(`https://www.epicgames.com/account/transactions?lang=en-US`, {waitUntil: "load"});
    let isStillVisible = await isElementVisible(page, '#payment-history-show-more-button');
    while (isStillVisible) {
        await page.click('#payment-history-show-more-button')
            .catch(() => {});
        isStillVisible = await isElementVisible(page, '#payment-history-show-more-button');
    }
    
    const myEpicGamesList = await page.$$eval('.am-1xcu1kd .am-1vpuhu6', option => option.map(item => item.innerText));

    for (const game of myEpicGamesList) {
        let error = null;
        let duration = '--';
        await page.goto(`https://howlongtobeat.com/?q=${game.replaceAll(' ', '%2520')}`, {waitUntil: "load"});
        try {
            await page.waitForSelector('h3.SearchOptions_search_title__83U9o', { timeout: 5_000 });
        } catch (e) {
            error = e;
            continue;
        }
        if (!error) {
            duration = await page.evaluate(el => {
                return document
                .querySelector('ul > li:first-child > div > div.GameCard_search_list_details__yJrue > div.GameCard_search_list_details_block__XEXkr > div > div:nth-child(2)')
                ?.textContent;
            });
        }        
        await page.goto(`https://www.metacritic.com/search/${game.replaceAll(' ', '%20')}/?page=1&category=13`, {waitUntil: "load"});
        await page.waitForSelector('div.c-productSubpageNavigation', { timeout: 5_000 });
        const metacriticScore = await page.evaluate(el => {
            return document.querySelector('div.c-pageSiteSearch-results > div:nth-child(2) > div > a > div:nth-child(3) > div > div > span')?.textContent;
        });
        const durationParsed = duration?.trim().includes('Mins')
            ? `${+(duration?.trim()?.replaceAll('½', ',5')?.replaceAll(' Mins', ''))/60}`.replaceAll('.', ',')
            : duration?.trim()?.replaceAll('½', ',5')?.replaceAll(' Hours', '');
        listGamesDurationArray.push({
            title: game,
            duration: durationParsed,
            metacriticScore: metacriticScore || 'No encontrada',
            library: 'Epic Games',
            ratio: isNaN(metacriticScore) || isNaN(durationParsed) || !metacriticScore || !durationParsed
                ? '--'
                : `${+metacriticScore/+durationParsed}`.replaceAll('.', ','),
            valorationAfterPlayed: '',
            played: false
        });
    }   

    const csvDurationList = convertArrayToCSV(listGamesDurationArray, { separator: ';' });
    fs.writeFileSync('games-with-score-and-duration.csv', csvDurationList);
    console.log('Web Scraping Complete');

    async function isElementVisible(page, selector) {
        let visible = true;
        await page
            .waitForSelector(selector, { visible: true, timeout: 2000 })
            .catch(() => {
                visible = false;
            });
        return visible;
    }
}

scrapeLibraryGamesListWithScoresAndDuration();
