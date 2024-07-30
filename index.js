import fs from 'fs'
import { initMetadata, oldMetadata, newMetadata } from "./communication/dhis.js"
import { allMFRFacilities, initConfiguration } from "./communication/mfr.js"
import { FACILITY_TYPE_ATTRIBUTE_ID, IS_PHCU_ATTRIBUTE_ID, LAST_UPDATED_ATTRIBUTE_ID, LOCATION_ATTRIBUTE_ID, OPERATIONAL_STATUS_ATTRIBUTE_ID, OWNERSHIP_ATTRIBUTE_ID, SETTLEMENT_ATTRIBUTE_ID } from "./constants.js";
import { changeToPHCUName, getClosedDate, getDHISId, getFacilityCode, getFacilityType, getHierarchyId, getIsPHCU, getLastUpdated, getOperationalStatus, getOwnership, getSettlement } from "./services.js";

initMetadata();

initConfiguration();
console.log("Finished reading files.")
let allDhisIds = []

let mfrFilteredFacilities = {
    dhisIdMapped: {},
    mfrIdMapped: {}
}

let duplicateDhisIdsCount = 0;

Object.keys(allMFRFacilities).forEach(mfrId=>{
    let facility = allMFRFacilities[mfrId]

    let dhisId = getDHISId(facility)
    if(dhisId){
        //filter out facilities that have duplicate DHIS id or doesn't exist in DHIS.
        if(-1!==allDhisIds.indexOf(dhisId) || !newMetadata.orgUnits[dhisId]){
            let mfr=mfrFilteredFacilities.dhisIdMapped[dhisId]
            if(mfr){
                delete mfrFilteredFacilities.dhisIdMapped[dhisId]
                delete mfrFilteredFacilities.mfrIdMapped[mfr.id] 
            }
            allDhisIds.splice(allDhisIds.indexOf(dhisId),1)
        }else{
            mfrFilteredFacilities.dhisIdMapped[dhisId] = facility
            mfrFilteredFacilities.mfrIdMapped[mfrId]=facility
            allDhisIds.push(dhisId)
        }
    }
})

let dhisPayloadFinal = []


const updateFacility = (dhisObject, mfrObject, affectedValue)=>{
    let settlement = getSettlement(mfrObject)
    let ownership = getOwnership(mfrObject)
    let facilityType = getFacilityType(mfrObject)
    let isParentPHCU = mfrObject.isParentPHCU
    let isPHCU = getIsPHCU(mfrObject)
    let code = getFacilityCode(mfrObject)
    let opStatus = getOperationalStatus(mfrObject)
    let lastUpdated = getLastUpdated(mfrObject)
    let operationalStatus = getOperationalStatus(mfrObject)

    dhisObject.code = code
    dhisObject.name = mfrObject.name
    dhisObject.attributeValues=[
        {"attribute":{"id":LOCATION_ATTRIBUTE_ID},"value":mfrObject.id},
        {"attribute":{"id":LAST_UPDATED_ATTRIBUTE_ID},"value":lastUpdated},
        {"attribute":{"id":FACILITY_TYPE_ATTRIBUTE_ID},"value":facilityType},
        {"attribute":{"id":OWNERSHIP_ATTRIBUTE_ID},"value":ownership},
        {"attribute":{"id":SETTLEMENT_ATTRIBUTE_ID},"value":settlement},
        {"attribute":{"id":OPERATIONAL_STATUS_ATTRIBUTE_ID},"value":operationalStatus},
//        {"attribute":{"id":IS_PHCU_ATTRIBUTE_ID},"value":isPHCU}, intentionally leaving this.

    ]

    if(operationalStatus==="Closed"){
        dhisObject.name = dhisObject.name+"_Closed"
        dhisObject.closedDate=getClosedDate(mfrObject);
        if(new Date(dhisObject.openingDate)>new Date(dhisObject.closedDate)){
            dhisObject.closedDate=new Date().toISOString();
        }
    }
    
    let hierarchyId = getHierarchyId(mfrObject)
    let parentId = hierarchyId.split('/')[1];

    if(isPHCU || ownership==="Public/Government" && facilityType==="Health Center"){
        let mfrParentObject = mfrFilteredFacilities.mfrIdMapped[parentId]
        let parentDHISObject = newMetadata.orgUnits[getDHISId(mfrParentObject)];//This one is because of the MFR object.

        //This means that the mfr is a HC, and we want to maintain it's parent PHCU but make sure that it's parent PHCU is reporting to the other one.
        let dhisParent = newMetadata.orgUnits[dhisObject.parent.id]//This is what already exists in DHIS2.
        if(dhisParent.name.includes("PHCU")){
            //Now this is a PHCU therefore we will need to edit this phcu.
            dhisParent.name = changeToPHCUName(mfrObject.name)
            dhisParent.code=code+"_PHCU"
            dhisParent.attributeValues=[
                {"attribute":{"id":LOCATION_ATTRIBUTE_ID},"value":mfrObject.id+"_PHCU"},
                {"attribute":{"id":LAST_UPDATED_ATTRIBUTE_ID},"value":lastUpdated},
                {"attribute":{"id":FACILITY_TYPE_ATTRIBUTE_ID},"value":facilityType},
                {"attribute":{"id":OWNERSHIP_ATTRIBUTE_ID},"value":ownership},
                {"attribute":{"id":SETTLEMENT_ATTRIBUTE_ID},"value":settlement},
                {"attribute":{"id":OPERATIONAL_STATUS_ATTRIBUTE_ID},"value":operationalStatus},
                {"attribute":{"id":IS_PHCU_ATTRIBUTE_ID},"value":true},
            ]
            if(operationalStatus==="Closed"){
                if(operationalStatus==="Closed"){
                    dhisObject.name = dhisObject.name+"_Closed"
                    dhisObject.closedDate=getClosedDate(mfrObject);
                    if(new Date(dhisObject.openDate)>new Date(dhisObject.closedDate)){
                        dhisObject.closedDate=new Date().toISOString();
                    }
                }
                dhisParent.name=dhisParent.name+"_PHCU"
                dhisParent.closedDate=getClosedDate(mfrObject);
            }
            //instead of changing the parent of the parent facility, we move the parent of the PHCU
            if(parentDHISObject){
                //If the parent is mapped, change the hierarchy but if the parent is not mapped, we can't change the hierarchy.
                dhisParent.parent= {"id":parentDHISObject.id}
            }
            dhisParent.affected=affectedValue;//1 means that there is no prerequisit for it.

            //Adding isPHCU false, because it doesn't make sense. 
            dhisObject.attributeValues.push({"attribute":{"id":IS_PHCU_ATTRIBUTE_ID},"value":false})
        }else{
            //This means that the parent is not a PHCU so we can't change the parent PHCU at all. but can change the immediate parent.
            if(parentDHISObject){
                dhisObject.parent={"id":parentDHISObject.id}
            }

            //We will still retain the is PHCU in this case.

            dhisObject.attributeValues.push({"attribute":{"id":IS_PHCU_ATTRIBUTE_ID},"value":false})
        }
    }   else{
        //If it is not PHCU just try to add it to attribute and update the path.
        dhisObject.attributeValues.push({"attribute":{"id":IS_PHCU_ATTRIBUTE_ID},"value":false})

        let mfrParentObject = mfrFilteredFacilities.mfrIdMapped[parentId]
        let parentDHISObject = newMetadata.orgUnits[getDHISId(mfrParentObject)]

        if(mfrParentObject && getIsPHCU(mfrParentObject) && parentDHISObject){//Check if parent is PHCU
            dhisObject.parent={"id":parentDHISObject.parent.id}
        } else if(parentDHISObject){
            dhisObject.parent = {"id": parentDHISObject.id}
        }
    }
    dhisObject.affected=affectedValue;
}

let ownerships=[];
let settlements = [];
let fts = []
let statuses = []
let closedFacilities = []

console.log("All DHIS2 ids from MFR",allDhisIds.length)

/**We should only process PHCU's first as they will affect their childrens in making 
 * the parent of the HP's under them their new grand parents.
 */
allDhisIds.forEach(dhisId=>{
    let mfrObject = mfrFilteredFacilities.dhisIdMapped[dhisId]
    let dhisNewObject = newMetadata.orgUnits[dhisId]
    let opStatus = getOperationalStatus(mfrObject)
    let isPHCU = getIsPHCU(mfrObject)
    let alreadyMappedDHISObject = newMetadata.orgUnitUsingMFRId[mfrObject.id]


    if(opStatus === 'Duplicate'){
        console.log("Duplicate ignoring")
        return;
    }

    if(mfrObject.id==="37b61ff3-f160-467b-b8ed-7a211d09c658" || dhisId === "Ihz3y1zwc9A"){
        console.log("interesting")
    }

  
    
    let mfrIdInDHISObject = dhisNewObject.attributeValues[LOCATION_ATTRIBUTE_ID]

    if(isPHCU){
        if(mfrIdInDHISObject === mfrObject.id){
            updateFacility(dhisNewObject,mfrObject,4)
        }else if(mfrIdInDHISObject){
            let previousMappingMfrObject = mfrFilteredFacilities.mfrIdMapped[mfrIdInDHISObject]

            if(getDHISId(previousMappingMfrObject) !== dhisNewObject.id){
                //This is fine because the previous mapping is now changed to a new mapping.
                updateFacility(dhisNewObject,mfrObject,3)
            }else{
                //THis is wrong mapping.
            //remapFacility(mfrIdInDHISObject, )

            //Check if the previous mapping has changed.
            console.log("wrong mapping.",previousMappingMfrObject)
            }
        }else{
            //This is new mapping
            updateFacility(dhisNewObject,mfrObject,2)

        }
    }

})
allDhisIds.forEach(dhisId=>{

    let mfrObject = mfrFilteredFacilities.dhisIdMapped[dhisId]
    let dhisOldObject = oldMetadata.orgUnits[dhisId]
    let dhisNewObject = newMetadata.orgUnits[dhisId]
    let opStatus = getOperationalStatus(mfrObject)
    let isPHCU = getIsPHCU(mfrObject)
    let alreadyMappedDHISObject = newMetadata.orgUnitUsingMFRId[mfrObject.id]

    if(mfrObject.id==="37b61ff3-f160-467b-b8ed-7a211d09c658" || dhisId === "Ihz3y1zwc9A"){
        console.log("interesting")
    }


    if(opStatus === 'Duplicate'){
        console.log("Duplicate ignoring")
        return;
    }

    let mfrIdInDHISObject = dhisNewObject.attributeValues[LOCATION_ATTRIBUTE_ID]
    if(alreadyMappedDHISObject && dhisNewObject && alreadyMappedDHISObject.id !== dhisNewObject.id){
        //This means that the mapping is changed.
        if(!mfrFilteredFacilities.dhisIdMapped[alreadyMappedDHISObject.id]){
            //this means that this facility was wrongly mapped and now is not mapped to anything so revert it back to the staging server.
            newMetadata.orgUnits[alreadyMappedDHISObject.id] = oldMetadata.orgUnits[alreadyMappedDHISObject.id];
            newMetadata.orgUnits[alreadyMappedDHISObject.id].affected=1;
            console.log("restoring facility")
        }
    }
    if(mfrObject.isParentPHCU && dhisNewObject.name.includes("PHCU")){
        //This is wrongly matched meaning a Health post is mapped to a phcu so ignore hierarchy change.
        console.log("A health post being mapped to a PHCU")
     return;   
    }
    if(!isPHCU){
        //PHCUs have already been handled.
        if(mfrIdInDHISObject=== mfrObject.id){
            updateFacility(dhisNewObject, mfrObject,4)
        }else if(mfrIdInDHISObject){
            let previousMappingMfrObject = mfrFilteredFacilities.mfrIdMapped[mfrIdInDHISObject]
            if(getDHISId(previousMappingMfrObject) !== dhisNewObject.id){
                updateFacility(dhisNewObject, mfrObject,3)
            }else{
                console.error("Need to restore a mapping")
            }
        }else{
            updateFacility(dhisNewObject,mfrObject,2)
        }
    }
})

let affectedOrgUnits = {
    1:[],
    2:[],
    3:[],
    4:[]
}
let finalOrganisations=[];
Object.keys(newMetadata.orgUnits).forEach(ouId=>{
    if( ouId === 'rrlJZApPEoR' || ouId === "L5cHTZva2GR" ){
        let item = newMetadata.orgUnits[ouId]
        console.log("interesting")
        return;
    }
    if(newMetadata.orgUnits[ouId].affected){
        affectedOrgUnits[newMetadata.orgUnits[ouId].affected].push(newMetadata.orgUnits[ouId])
        finalOrganisations.push(newMetadata.orgUnits[ouId])
    }
})

console.log("Affected facilities are ")
fs.writeFileSync("orgUnitOutput1.json",JSON.stringify({"organisationUnits":affectedOrgUnits[1]}))
fs.writeFileSync("orgUnitOutput2.json",JSON.stringify({"organisationUnits":affectedOrgUnits[2]}))
fs.writeFileSync("orgUnitOutput3.json",JSON.stringify({"organisationUnits":affectedOrgUnits[3]}))
fs.writeFileSync("orgUnitOutput4.json",JSON.stringify({"organisationUnits":affectedOrgUnits[4]}))

/*
finalOrganisations.forEach(orgUnit=>{
    
})
*/
//Check if the facility is mapped



    //Get the orgUnits from DHIS2

    //get all facilities from MFR
    

    //Remap those facilities with their ID


    //remap the parents of DHIS2 items based on the path from MFR.


