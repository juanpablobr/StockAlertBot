import { fileURLToPath } from "url";
import { OPEN_URL } from '../main.js'
import { USER_AGENTS } from '../main.js'
import fs from "fs";
import threeBeeps from "../beep.js"
import sendAlertToWebhooks from "../webhook.js"
import writeErrorToFile from "../writeToFile.js"
import axios from "axios";
import moment from "moment";
import DomParser from "dom-parser";     // https://www.npmjs.com/package/dom-parser
import open from "open"

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


var ps5PreorderPagePath;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    let interval = {
        unit: 'seconds',    // seconds, m: minutes, h: hours
        value: 5           
    }
    let url = 'https://www.tesco.com/groceries/en-GB/products/306276176'
    ps5PreorderPagePath = './html/tescoPreorderPage.html'
    tesco(url, interval);
} else {
    ps5PreorderPagePath = './stores/html/tescoPreorderPage.html'
}


let firstRun = new Set();
let urlOpened = false;
export default async function tesco(url, interval) {
    if (url.includes('tescopreorders')) tescoPS5Preorder(url, interval)
    else {
        try {
            let res = await axios.get(url)
            .catch(async function (error) {
                if (error.response.status == 503) console.error('Tesco 503 (service unavailable) Error. Interval possibly too low. Consider increasing interval rate.')
                else writeErrorToFile('Tesco', error);
            });

            if (res && res.status == 200) {
                let parser = new DomParser();
                let doc = parser.parseFromString(res.data, 'text/html');
                let title = doc.getElementsByClassName('product-details-tile__title')[0].innerHTML.trim().slice(0, 150)
                let inventory = doc.getElementsByClassName('button small add-control button-secondary')[0].innerHTML

                if ((!inventory || !inventory.includes('Add')) && !firstRun.has(url)) {
                    console.info(moment().format('LTS') + ': "' + title + '" not in stock at Tesco. Will keep retrying every', interval.value, interval.unit)
                    firstRun.add(url)
                }
                else if (inventory && inventory.includes('Add')) {
                    threeBeeps();
                    if (OPEN_URL && !urlOpened) { 
                        open(url); 
                        sendAlertToWebhooks(moment().format('LTS') + ': ***** In Stock at Tesco *****: ' + title + "\n" + url)
                        urlOpened = true; 
                        setTimeout(() => urlOpened = false, 1000 * 115) // Open URL every 2 minutes
                    }
                    console.info(moment().format('LTS') + ': ***** In Stock at Tesco *****: ', title);
                    console.info(url);
                }
            }
    
        } catch (e) {
            writeErrorToFile('Tesco', e)
        }
    }
};


async function tescoPS5Preorder(url, interval) {
    url = url.replace('www.', '')
    try {
        let res = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
            }
        }).catch(async function (error) {
            writeErrorToFile('Tesco', error)
        });
        
        if (res && res.status == 200) {
            let ps5PreorderPage = fs.readFileSync(ps5PreorderPagePath, 'utf-8');   
            if (res.data.includes(ps5PreorderPage) && !firstRun.has(url)) {
                console.info(moment().format('LTS') + ': PlayStation 5 not in stock at Tesco. Will keep retrying every', interval.value, interval.unit)
                firstRun.add(url)
            }
            else if (!res.data.includes(ps5PreorderPage)) {
                threeBeeps();
                if (OPEN_URL && !urlOpened) { open(url); urlOpened = true; setTimeout(() => urlOpened = false, 1000 * 115) }  // Open URL every 2 minutes
                console.info(moment().format('LTS') + ': ***** In Stock at Tesco *****: PlayStation 5');
                console.info(url);
            }
        }
    } catch (e) {
        writeErrorToFile('Tesco', e)
    }
}
