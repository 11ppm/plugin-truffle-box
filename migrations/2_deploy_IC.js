const IC = artifacts.require("InternalContract");
const chalk = require("chalk");
const fs = require("fs");
const Database = require('better-sqlite3');
require("dotenv").config();

const PLIADDRESS = process.env["PLIADDRESS"]; // This is either mainnet or apothem contract address

const db = new Database('../data/data.db', {verbose: console.log });
var tableModel = "topcrypto_model";
var tableNew;
var tableMain = "main";

var oracle;
//var oracle = "0x258b4adA9E315A0b0c2a8437E1A41F0767241F2A";
var jobId;
//var jobId = "2ae512ed7ba74d8380b47da17da114db";
var datafeed; // tl_binance, tl_coingecko, etc (set in datafeed.txt, one at a time)
//var datafeed = "tl_BiNance";
var tsyms; // USD, EUR, XDC, etc (set in tsyms.txt, one at a time)
//var tsyms = "EUR";
var fsyms;
//var fsyms = "btc";
var ic;
var prevNonce;

module.exports = async function(deployer) {
    await getStuff();
    
    // Create InternalContract
    await checkState(); // get next fsyms from datafeed
    await deployer.deploy(IC,PLIADDRESS,oracle,jobId,fsyms,tsyms);
    await updateDBforIC();
    await flipState(); // mark this fsyms as create against this datafeed
}

async function getStuff() {
    const getOJDT = db.prepare(`SELECT oracle, jobid, datafeed, tsyms FROM ${tableMain} WHERE ic IS NULL`);
    let result = getOJDT.get();
    oracle = result.oracle;
    jobId = result.jobid;
    datafeed = result.datafeed;
    tsyms = result.tsyms;
    tableNew = `topcrypto_${datafeed}`;

    console.log("\n");
    console.log(`The datafeed deployeIC will continue to use is: ${chalk.green(datafeed)}`);
    console.log(`The tsyms deployIC will continue to use for the IC will be ${chalk.green(tsyms)}`);
    console.log(`The table to be created or used to track pairs created will be: ${chalk.green(tableNew)}`);
    console.log(`The OCA for this IC will be: ${chalk.green(oracle)}`);
    console.log(`The JobId for this IC will be: ${chalk.green(jobId)}`);
}

async function checkState() {
    const check = db.prepare(`SELECT symbol FROM ${tableNew} WHERE ${tsyms} IS 0`);
    let result = check.get(); // get the first crypto symbol that has 0 in this column  (hasn't had an IC created yet)
    fsyms = result.symbol;

    console.log("\n");
    console.log(`The fsyms for this IC will be: ${chalk.green(fsyms)}`);
}

async function updateDBforIC() {
    ic = IC.address;
    const infoIC = db.prepare(`UPDATE ${tableMain} SET fsyms = '${fsyms}', ic = '${ic}' WHERE oracle = '${oracle}'`);
    infoIC.run();

    console.log("\n");
    console.log(`Created ICA ${chalk.green(ic)} with oracle: ${chalk.green(oracle)}, jobid: ${chalk.green(jobId)}, fsyms: ${chalk.green(fsyms)}, tsyms: ${chalk.green(tsyms)} and datafeed: ${chalk.green(datafeed)}`);
    console.log(`Updated row with ICA: ${chalk.green(ic)} and fsyms: ${chalk.green(fsyms)}`);
}

async function flipState() {
    const flip = db.prepare(`UPDATE ${tableNew} SET ${tsyms} = 1 WHERE symbol = '${fsyms}'`);
    flip.run();
    console.log("\n");
    console.log(`The IC for the ${chalk.green(fsyms)}-${chalk.green(tsyms)} pair with oracle: ${chalk.green(oracle)} and jobId: ${chalk.green(jobId)} are now marked done in ${chalk.green(tableNew)}`)

    const checkWork = db.prepare(`SELECT * FROM ${tableNew} WHERE symbol = '${fsyms}'`);
    let result = checkWork.all();
    console.log(result)
}

