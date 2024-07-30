/**
 * This returns the DHIS id of a variable if it has one or null.
 * @param {mfrObject} facilityObject an mfr object
 * @returns the DHIS id of that mfr object.
 */
export const getDHISId = (facilityObject) => {
    if (!facilityObject || !facilityObject.identifier) {
        return null;
    }
    let dhisIdentifier = facilityObject.identifier.find(identifier => {
        if ('dhisId' === identifier.type.coding[0].code) {
            return identifier.value
        }
    })

    return dhisIdentifier?.value
}

/**
 * Gets the DHIS id of a facility using the id of the facility.
 * @param {string} mfrId an mfr id in string
 * @returns a dhis id if it has one or null
 */
const getDHISidFromId = (mfrId) => {
    if (mfrFacilities[mfrId]) {
        return getDHISIdentifier(mfrFacilities[mfrId])
    }
    return null;
}

/**
 * gets the mfr code.
 * @param {object} facilityObject the mfr object
 * @returns a code in string format
 */
export const getFacilityCode = (facilityObject) => {
    let facilityCode = facilityObject.identifier.find(identifier => {
        if ('facilityId' === identifier.type.coding[0].code) {
            return identifier.value
        }
    })
    return facilityCode?.value
}

export const getHierarchyId = (mfrObject) => {
    return mfrObject.extension.find(extension => {
        if ('reportingHierarchyId' === extension.url) {
            return extension
        }
    }).valueString
}

const getPath = (mfrObject) => {
    let hierarchyId = getHierarchyId(mfrObject)
    let ancestors = hierarchyId.split('/')
    let path = ""
    ancestors.forEach((ancestor, index) => {
        if (index !== 0) {
            let dhisId = getDHISidFromId(ancestor)
            if (dhisId) {
                path = "/" + dhisId + path
            }
        }
    })
    return path
}

const getStatus = (mfrObject) => {
    let extension = mfrObject.extension.find(extension => {
        if ('status' === extension.url) {
            return extension
        }
    })
    return extension.valueString
}

export const getLastUpdated = (mfrObject) => {
    return mfrObject.meta.lastUpdated;
}

export const getOperationalStatus = (mfrObject) => {
    return mfrObject?.operationalStatus?.display
}

export const getFacilityType = (mfrObject) => {
    let type = mfrObject.type.find(type => {
        if ('FT' === type.coding[0].code) {
            return type
        }
    })
    return type.text
}
export const getSettlement = (mfrObject) => {
    let extension = mfrObject.extension.find(ex => {
        if ('FacilityInformation' === ex.url) {
            return ex
        }
    })

    let finalEx = extension.extension.find(ex => {
        if ('settlement' === ex.url)
            return ex
    })
    return finalEx.valueString
}
export const getOwnership = (mfrObject) => {
    let extension = mfrObject.extension.find(ex => {
        if ('FacilityInformation' === ex.url) {
            return ex
        }
    })

    let finalEx = extension.extension.find(ex => {
        if ('ownership' === ex.url)
            return ex
    })
    return finalEx.valueString
}
export const getIsPHCU = (mfrObject) => {
    let extension = mfrObject.extension.find(ex => {
        if ('FacilityInformation' === ex.url) {
            return ex
        }
    })

    let finalEx = extension.extension.find(ex => {
        if ('isPrimaryHealthCareUnit' === ex.url)
            return ex
    })
    return finalEx.valueBoolean
}

export const getClosedDate = (mfrObject) => {
    let extension = mfrObject.extension.find(ex => {
        if ('FacilityInformation' === ex.url) {
            return ex
        }
    })

    let finalEx = extension.extension.find(ex => {
        if ('closedDate' === ex.url)
            return ex
    })
    let valueDate = finalEx?.valueDate ?? new Date();
    return new Date(valueDate).toISOString();
}

const getOpeningDate = (mfrObject) => {
    let extension = mfrObject.extension.find(ex => {
        if ('FacilityInformation' === ex.url) {
            return ex
        }
    })

    let finalEx = extension.extension.find(ex => {
        if ('yearOpened' === ex.url)
            return ex
    })
    return finalEx.valueDate
}

export const changeToPHCUName = (name) => {
    return ((name).replace(/\s+/g, ' ').replace(/health center/gi, '')).trim() + "_PHCU"
}

export function remapArray(array, field) {
    array.forEach(item => {
        array[item[field]] = item
    });
}