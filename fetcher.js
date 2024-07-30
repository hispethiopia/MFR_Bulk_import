import request from "sync-request"
import fs from "fs"

console.log("Working")
const username = 'userName'
const password = 'password'
const credentials = Buffer.from(`${username}:${password}`).toString('base64');

const dhisNew = "https://dhis2-new.moh.gov.et/api/"

const dhisOld = "https://hmis-staging.moh.gov.et/api/"

const mfr = "https://fhir-mfr.sandboxaddis.com/fhir/Location"


function getAndSave(url, filename) {
    console.log("url is ", url)
    const response = request('GET', encodeURI(url), {
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        }
    });
    fs.writeFileSync(filename, response.getBody().toString());
}
function getAndSaveMFR(url, folder, filename) {
    console.log(filename, "url is ", url)
    const response = request('GET', encodeURI(url));
    fs.writeFileSync(folder + filename, response.getBody().toString());
    let res = JSON.parse(response.getBody().toString())
    let next = res.link.find(item => item.relation === "next")
    if (next) {
        getAndSaveMFR(next.url, folder, filename + 1)
    }
}

getAndSave(dhisNew + "organisationUnits.json?paging=false&fields=*", "data/dhis/new/organisationUnits.json")
getAndSave(dhisNew + "dataSets.json?paging=false&fields=*", "data/dhis/new/dataSets.json")
getAndSave(dhisNew + "users.json?paging=false&fields=*", "data/dhis/new/users.json")
getAndSave(dhisNew + "organisationUnitGroups.json?paging=false&fields=*", "data/dhis/new/organisationUnitGroups.json")
getAndSave(dhisNew + "categoryOptions.json?paging=false&fields=*", "data/dhis/new/categoryOptions.json")
getAndSave(dhisNew + "dataStore/Dhis2-MFR.json?paging=false&fields=.", "data/dhis/new/configurations.json")


getAndSave(dhisOld + "organisationUnits.json?paging=false&fields=*", "data/dhis/old/organisationUnits.json")
getAndSave(dhisOld + "dataSets.json?paging=false&fields=*", "data/dhis/old/dataSets.json")
getAndSave(dhisOld + "users.json?paging=false&fields=*", "data/dhis/old/users.json")
getAndSave(dhisOld + "organisationUnitGroups.json?paging=false&fields=*", "data/dhis/old/organisationUnitGroups.json")
getAndSave(dhisOld + "categoryOptions.json?paging=false&fields=*", "data/dhis/old/categoryOptions.json")
getAndSave(dhisOld + "dataStore/Dhis2-MFR.json?paging=false&fields=.", "data/dhis/old/configurations.json")


const pageCount = 2000
//getAndSaveMFR("https://fhir-mfr.sandboxaddis.com/fhir/Location?_count=" + pageCount, "data/mfr/", 1)
