import { LOCATION_ATTRIBUTE_ID } from "../constants.js";
import fs from 'fs'
export let oldMetadata = {
    orgUnits: {},
    dataSets: {},
    users: {},
    orgUnitGroups: {},
    categoryOptions: {},
    configurations: {},
}


export let newMetadata = {
    orgUnits: {},
    dataSets: {},
    users: {},
    orgUnitGroups: {},
    categoryOptions: {},
    configurations: {},
    orgUnitUsingMFRId: {},
}

function init(variable, folder) {
    let ous = JSON.parse(fs.readFileSync(folder + 'organisationUnits.json').toString()).organisationUnits

    ous.forEach(ou => {
        ou.attributeValues.forEach(attribute => {
            ou.attributeValues[attribute.attribute.code] = attribute.value
            ou.attributeValues[attribute.attribute.id] = attribute.value
        })
        if (ou.attributeValues[LOCATION_ATTRIBUTE_ID]) {
            newMetadata.orgUnitUsingMFRId[ou.attributeValues[LOCATION_ATTRIBUTE_ID]] = ou;
        }
        variable.orgUnits[ou.id] = ou
    });

    let dataSets = JSON.parse(fs.readFileSync(folder + 'dataSets.json').toString()).dataSets

    dataSets.forEach(ds => {
        variable.dataSets[ds.id] = ds
    })

    let users = JSON.parse(fs.readFileSync(folder + 'users.json').toString()).users
    users.forEach(user => {
        variable.users[user.id] = user
    })

    let categoryOptions = JSON.parse(fs.readFileSync(folder + 'categoryOptions.json').toString()).categoryOptions
    categoryOptions.forEach(co => {
        variable.categoryOptions[co.id] = co
    })

    let ougs = JSON.parse(fs.readFileSync(folder + 'organisationUnitGroups.json').toString()).organisationUnitGroups
    ougs.forEach(oug => {
        variable.orgUnitGroups[oug.id] = oug
    })

    variable.configurations = JSON.parse(fs.readFileSync(folder + 'configurations.json').toString())
    console.log("Finished reading DHIS2 items.")
}

export function initMetadata() {
    init(oldMetadata, process.cwd() + '/data/dhis/old/')
    init(newMetadata, process.cwd() + '/data/dhis/new/')
}