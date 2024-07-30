import fs from 'fs'
import { getDHISId, getIsPHCU } from '../services.js';

export let allMFRFacilities = {

}

const getHierarchyId = (mfrObject) => {
    if (!mfrObject.extension) {
        //console.log("Not finding",  mfrObject)
        return null;
    }
    return mfrObject.extension.find(extension => {
        if ('reportingHierarchyId' === extension.url) {
            return extension
        }
    }).valueString
}

const getDHISIdentifier = (facilityObject) => {
    if (!facilityObject.identifier) {
        return false
    }
    let dhisIdentifier = facilityObject.identifier.find(identifier => {
        if ('dhisId' === identifier.type.coding[0].code) {
            return identifier.value
        }
    })

    return dhisIdentifier?.value
}

export const initConfiguration = () => {
    let allResponses = []
    let directory = process.cwd() + "/data/mfr/"
    let files = fs.readdirSync(directory)
    let tempFacilities = {}

    files.forEach(fileName => {
        let file = JSON.parse(fs.readFileSync(directory + fileName))
        if (file.entry)
            allResponses.push(...file.entry)
    })


    allResponses.forEach(res => {
        /**
         * Mapping this because we want to find the parent facility for future purposes.
         */
        let facility = res.resource
        tempFacilities[facility.id] = facility
    })

    allResponses.forEach(res => {
        let facility = res.resource
        let hierarchyId = getHierarchyId(facility)
        if (!hierarchyId) {
            //Ignore these as these are not really facilities.
            return;
        }
        allMFRFacilities[facility.id] = facility
        let parentId = hierarchyId.split('/')[1]


        if (parentId && tempFacilities[parentId]) {
            if (getIsPHCU(tempFacilities[parentId])) {
                allMFRFacilities[facility.id].isParentPHCU = true;

            }
        }
    })
}

