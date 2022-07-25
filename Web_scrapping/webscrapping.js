// 1.1 Read data from a source: cricinfo worldcup 2019(axios)
// 1.2 Process data: Get all teams(jsdom)
// 1.3 Write processed data in excel : Match results per team in their own sheet(excel4node)
// 1.4 Create Folders: One for each team(fs)
// 1.5 Write Files: PDF file for scorecard of each match in relevant folder(pdf - lib)

// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

// node webscrapping.js --excel=wroldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require('minimist');
let fs = require('fs');
let path = require('path');
let axios = require('axios');
let excel = require('excel4node');
let jsdom = require('jsdom');
let pdf = require('pdf-lib');


let args = minimist(process.argv);
// console.log(args.source);

let responsekapromise = axios.get(args.source);
responsekapromise.then(function (response) {
    let html = response.data;
    // console.log(html);
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matches = [];
    let matchScore = document.querySelectorAll("div.match-score-block");

    for (let i = 0; i < matchScore.length; i++) {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        }
        let namesPs = matchScore[i].querySelectorAll("div.name-detail > p.name");
        match.t1 = namesPs[0].textContent;
        match.t2 = namesPs[1].textContent;

        let scoreSpan = matchScore[i].querySelectorAll("div.score-detail > span.score");


        if (scoreSpan.length == 2) {
            match.t1s = scoreSpan[0].textContent;
            match.t2s = scoreSpan[1].textContent;
        } else if (scoreSpan.length == 1) {
            match.t1s = scoreSpan[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let spanResult = matchScore[i].querySelector("div.status-text > span");
        match.result = spanResult.textContent;
        matches.push(match);
        // console.log(i);
    }
    // console.log(matches);
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON, "utf8");

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        putMatchesInArrayIfMissing(teams, matches[i]);
    }

    for (let i = 0; i < matches.length; i++) {
        putMatchesInAppropriateTeam(teams, matches[i]);
    }
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("team.json", teamsJSON, "utf-8");

    creatExcelFile(teams);
    createFolder(teams);


});

function createFolder(teams){
    fs.mkdirSync(args.dataFolder);
    for(let i=0; teams.length;i++){
        let teamFN=path.join(args.dataFolder,teams[i].name);
        fs.mkdirSync(teamFN);
        for(let j=0;j<teams[i].matches.length;j++){
            let matchesFileName =path.join(teamFN,teams[i].matches[j].vs +".pdf");
            createScoreCard(teams[i].name,teams[i].matches[j],matchesFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfscore;
    let t2s = match.oppscore;
    let result = match.result;

    let originalBytes = fs.readFileSync("Template.pdf")
    let promiseToLoadBytes = pdf.PDFDocument.load(originalBytes);


    promiseToLoadBytes.then(function (pdfdoc) {
        let timesRomanFontPromise = pdfdoc.embedFont(pdf.StandardFonts.TimesRoman)
        timesRomanFontPromise.then(function (timesRoman) {
            let page = pdfdoc.getPage(0);

            page.drawText(t1, {
                x: 210,
                y: 668.35,
                size: 14,
                font: timesRoman
            });
            page.drawText(t2, {
                x: 210,
                y: 652,
                size: 14,
                font: timesRoman
            });
            page.drawText(t1s, {
                x: 210,
                y: 635,
                size: 14,
                font: timesRoman
            });
            page.drawText(t2s, {
                x: 210,
                y: 619.5,
                size: 14,
                font: timesRoman
            });
            page.drawText(result, {
                x: 210,
                y: 602,
                size: 14,
                font: timesRoman
            });
            let promiseToSave = pdfdoc.save();
            promiseToSave.then(function (changeBytes) {
                fs.writeFileSync(matchFileName, changeBytes);
            });

        });
    });

}
function creatExcelFile(teams) {
    let wb = new excel.Workbook();
    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string("Opponent");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Opponent Score");
        sheet.cell(1, 4).string("Result");

        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }

    }
    wb.write(args.excel);
}

function putMatchesInArrayIfMissing(teams, match) {
    // team 1
    let t1idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });
    }
    //  team 2
    let t2idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });
    }
}

function putMatchesInAppropriateTeam(teams, match) {
    //   team 1
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    });
    //   team 2
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });
}




















