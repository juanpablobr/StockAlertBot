import { fileURLToPath } from "url";
import { OPEN_URL } from '../main.js'
import { USER_AGENTS } from '../main.js'
import threeBeeps from "../beep.js"
import sendAlertToWebhooks from "../webhook.js"
import writeErrorToFile from "../writeToFile.js"
import axios from "axios";
import moment from "moment";
import DomParser from "dom-parser";     // https://www.npmjs.com/package/dom-parser
import open from "open"


if (process.argv[1] === fileURLToPath(import.meta.url)) {
    let interval = {
        unit: 'seconds',  // seconds, m: minutes, h: hours
        value: 30
    }
    let url = 'https://www.antonline.com/Sony/Electronics/Audio_Electronics/Headsets+Earsets/1398728'
    antonline(url, interval);
}


let firstRun = new Set();
let urlOpened = false;
export default async function antonline(url, interval) {
    try {
        let res = await axios.get(url, {
            headers: {
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
            }
        }).catch(async function (error) {
            if (error.response.status == 503) console.error('Ant Online 503 (service unavailable) Error. Interval possibly too low. Consider increasing interval rate.')
            else writeErrorToFile('AntOnline', error);
        });

        if (res && res.status === 200) {
            let parser = new DomParser();
            let doc = parser.parseFromString(res.data, 'text/html');
            let title = doc.getElementsByClassName('title')[0].innerHTML.slice(0, 150)
            let inventory = doc.getElementsByClassName('uk-button uk-button-primary add_to_cart')

            if (inventory && inventory.length > 0) inventory = inventory[0].textContent
            if (inventory && inventory.length == 0 && !firstRun.has(url)) {
                console.info(moment().format('LTS') + ': "' + title + '" not in stock at Ant Online. Will keep retrying every', interval.value, interval.unit)
                firstRun.add(url)
            }
            else if (inventory && inventory == 'Add to Cart') {
                threeBeeps();
                if (OPEN_URL && !urlOpened) { 
                    open(url); 
                    sendAlertToWebhooks(moment().format('LTS') + ': ***** In Stock at Ant Online *****: ' + title + "\n" + url)
                    urlOpened = true; 
                    setTimeout(() => urlOpened = false, 1000 * 115) // Open URL every 2 minutes
                }  
                console.info(moment().format('LTS') + ': ***** In Stock at Ant Online *****: ', title);
                console.info(url);
            }
        } else {
            console.info(moment().format('LTS') + ': Error occured checking ' + title + '. Retrying in', interval.value, interval.unit)
        }

    } catch (e) {
        writeErrorToFile('AntOnline', e)
    }
};
