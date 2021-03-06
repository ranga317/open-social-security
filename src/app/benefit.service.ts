import { Injectable } from '@angular/core';
import {Person} from './data model classes/person';
import { CalculationYear } from './data model classes/calculationyear';
import { CalculationScenario } from './data model classes/calculationscenario';
import {MonthYearDate} from "./data model classes/monthyearDate"
import { BirthdayService } from './birthday.service';
import { FamilyMaximumService } from './familymaximum.service';


@Injectable()
export class BenefitService {

  constructor(private birthdayService: BirthdayService, private familyMaximumService: FamilyMaximumService) { }

  today: MonthYearDate = new MonthYearDate()
  deemedFilingCutoff: Date = new Date(1954, 0, 1)//January 2, 1954. If date is LESS than cutoff, old rules. If greater than OR EQUAL TO cutoff, new rules.

  //For people who will be getting pension from noncovered employment, at any given time we have to know whether to use WEP_PIA or nonWEP_PIA
  checkWhichPIAtoUse(person:Person, date:MonthYearDate){
    if (person.eligibleForNonCoveredPension === true){
        if (person.nonCoveredPensionDate <= date){//i.e., noncovered pension has begun
          person.entitledToNonCoveredPension = true
          person.PIA = person.WEP_PIA
        }
        else {//i..e, noncovered pension has not begun yet
          person.entitledToNonCoveredPension = false
          person.PIA = person.nonWEP_PIA
        }
    }
  }

  calculateRetirementBenefit(person:Person, benefitDate: MonthYearDate) {
    let retirementBenefit: number = 0
    let monthsWaited = benefitDate.getMonth() - person.FRA.getMonth() + 12 * (benefitDate.getFullYear() - person.FRA.getFullYear())
    if (monthsWaited < -36)
    {retirementBenefit = person.PIA - (person.PIA / 100 * 5 / 9 * 36) + (person.PIA / 100 * 5 / 12 * (monthsWaited+36))}
    if (monthsWaited < 0 && monthsWaited >= -36)
    {retirementBenefit = person.PIA + (person.PIA / 100 * 5 / 9 * monthsWaited)}
    if (monthsWaited == 0)
    {retirementBenefit = person.PIA}
    if (monthsWaited > 0 )
    {retirementBenefit = person.PIA + (person.PIA / 100 * 2 / 3 * monthsWaited)}

    if (person.isOnDisability === true) {//set retirement benefit (before DRCs from suspension) to PIA if person is disabled
      retirementBenefit = person.PIA
    }
    
    if (benefitDate >= person.FRA) {//If person didn't file until FRA or later, DRCs via suspension are applied to PIA
      retirementBenefit = retirementBenefit + (person.PIA * (2/3/100) * person.DRCsViaSuspension)
    }
    else {//If person filed before FRA, DRCs via suspension are applied to reduced benefit amount
      retirementBenefit = retirementBenefit + (retirementBenefit * (2/3/100) * person.DRCsViaSuspension)
    }
    
    //Any time this function is called, if person is receiving pension from noncovered employment, also recalculate their nonWEPretirementBenefit
    if (person.eligibleForNonCoveredPension === true){
      person.nonWEPretirementBenefit = retirementBenefit / person.PIA * person.nonWEP_PIA
    }

    return Number(retirementBenefit)
  }

  //calculates "original benefit" for use in family max formula (i.e., before reduction for family max, before reduction for own entitlement, before reduction for age, before reduction for GPO)
  calculateSpousalOriginalBenefit(otherPerson:Person):number{
    let spousalOriginalBenefit:number = otherPerson.PIA * 0.5
    return spousalOriginalBenefit
  }

  //calculates "original benefit" for use in family max formula (i.e., before reduction for family max, before reduction for own entitlement...
    //before reduction for age, before reduction for deceased's early entitlement, before reduction for GPO)
    //See FamilyMax.txt for more information.
  calculateSurvivorOriginalBenefit(deceasedPerson:Person):number{
    let survivorOriginalBenefit:number
    if (deceasedPerson.eligibleForNonCoveredPension === false) {
      if (deceasedPerson.retirementBenefit > deceasedPerson.PIA){
        survivorOriginalBenefit = deceasedPerson.retirementBenefit
      }
      else {
        survivorOriginalBenefit = deceasedPerson.PIA
      }
    }
    else {//if deceased person was subject to WEP, we have to calculate survivor benefits using non-WEP PIA (and non-WEP retirement benefit, which is based on non-WEP PIA)
      if (deceasedPerson.nonWEPretirementBenefit > deceasedPerson.nonWEP_PIA){
        survivorOriginalBenefit = deceasedPerson.nonWEPretirementBenefit
      }
      else {
        survivorOriginalBenefit = deceasedPerson.nonWEP_PIA
      }
    }

    return survivorOriginalBenefit
  }

  adjustSpousalBenefitsForAge(scenario:CalculationScenario, personA:Person, personB:Person){
  //Key point via CFR 404.410: spousal benefits not reduced for month in which there is a child in care (under 16 or disabled) who is entitled to child benefits on worker's record.
    let monthsOfPersonAearlySpousalEntitlement:number
    let monthsOfPersonBearlySpousalEntitlement:number
    let dateForCountingPersonAearlyEntitlement:MonthYearDate = new MonthYearDate(personA.spousalBenefitDate)
    let dateForCountingPersonBearlyEntitlement:MonthYearDate = new MonthYearDate(personB.spousalBenefitDate)
  
    if (personA.adjustedSpousalBenefitDate > personA.spousalBenefitDate){//if ARF has happened, use adjusted date
      dateForCountingPersonAearlyEntitlement = new MonthYearDate(personA.adjustedSpousalBenefitDate)
    }
    if (personB.adjustedSpousalBenefitDate > personB.spousalBenefitDate){//if ARF has happened, use adjusted date
      dateForCountingPersonBearlyEntitlement = new MonthYearDate(personB.adjustedSpousalBenefitDate)
    }

    //Check if there is *currently* a child under 16 or disabled
    let childUnder16orDisabled:boolean = this.birthdayService.checkForChildUnder16orDisabled(scenario)

    if (childUnder16orDisabled === false){
    //Reduce spousal benefits for age if there is no child who is disabled and/or *currently* under 16.
      //personA
        monthsOfPersonAearlySpousalEntitlement = personA.FRA.getMonth() - dateForCountingPersonAearlyEntitlement.getMonth() + 12 * (personA.FRA.getFullYear() - dateForCountingPersonAearlyEntitlement.getFullYear())
        if (monthsOfPersonAearlySpousalEntitlement > 0 && monthsOfPersonAearlySpousalEntitlement <= 36) {
          personA.monthlySpousalPayment = personA.monthlySpousalPayment - (personA.monthlySpousalPayment * 25/36/100 * monthsOfPersonAearlySpousalEntitlement)
        }
        if (monthsOfPersonAearlySpousalEntitlement > 36) {
          personA.monthlySpousalPayment = personA.monthlySpousalPayment - (personA.monthlySpousalPayment * 25/36/100 * 36) - (personA.monthlySpousalPayment * 5/12/100 * (monthsOfPersonAearlySpousalEntitlement-36))
        }
      //personB
        monthsOfPersonBearlySpousalEntitlement = personB.FRA.getMonth() - dateForCountingPersonBearlyEntitlement.getMonth() + 12 * (personB.FRA.getFullYear() - dateForCountingPersonBearlyEntitlement.getFullYear())
        if (monthsOfPersonBearlySpousalEntitlement > 0 && monthsOfPersonBearlySpousalEntitlement <= 36) {
          personB.monthlySpousalPayment = personB.monthlySpousalPayment - (personB.monthlySpousalPayment * 25/36/100 * monthsOfPersonBearlySpousalEntitlement)
        }
        if (monthsOfPersonBearlySpousalEntitlement > 36) {
          personB.monthlySpousalPayment = personB.monthlySpousalPayment - (personB.monthlySpousalPayment * 25/36/100 * 36) - (personB.monthlySpousalPayment * 5/12/100 * (monthsOfPersonBearlySpousalEntitlement-36))
        }
    }
  }

  adjustSurvivorBenefitsForRIB_LIM(livingPerson:Person, deceasedPerson:Person){
    //Determine whether RIB-LIM limit is 82.5% of deceased's PIA or amount deceased was receiving
      let RIB_LIMlimit:number = 0
      if (deceasedPerson.eligibleForNonCoveredPension === false){
        if (deceasedPerson.retirementBenefit > 0.825 * deceasedPerson.PIA){
          RIB_LIMlimit = deceasedPerson.retirementBenefit
        }
        else {
          RIB_LIMlimit = 0.825 * deceasedPerson.PIA
        }
      }
      else {//Use non-WEP PIA and retirement benefit if deceased person was subject to WEP during life.
        if (deceasedPerson.nonWEPretirementBenefit > 0.825 * deceasedPerson.nonWEP_PIA){
          RIB_LIMlimit = deceasedPerson.nonWEPretirementBenefit
        }
        else {
          RIB_LIMlimit = 0.825 * deceasedPerson.nonWEP_PIA
        }
      }
    //Limit sum of survivor's monthlySurvivorPayment and monthlyRetirementPayment to RIB-LIM limit
      if (livingPerson.monthlySurvivorPayment + livingPerson.monthlyRetirementPayment > RIB_LIMlimit){
        livingPerson.monthlySurvivorPayment = RIB_LIMlimit - livingPerson.monthlyRetirementPayment
      }
    //But don't let monthlySurvivorPayment be below zero
      if (livingPerson.monthlySurvivorPayment < 0) {
        livingPerson.monthlySurvivorPayment = 0
      }
  }

  adjustSpousalAndSurvivorBenefitsForGPO(personA:Person, personB:Person){
    if (personA.entitledToNonCoveredPension === true){
      personA.monthlySpousalPayment = personA.monthlySpousalPayment - (2/3 * personA.governmentPension)
      personA.monthlySurvivorPayment = personA.monthlySurvivorPayment - (2/3 * personA.governmentPension)
    }
    if (personB.entitledToNonCoveredPension === true){
      personB.monthlySpousalPayment = personB.monthlySpousalPayment - (2/3 * personB.governmentPension)
      personB.monthlySurvivorPayment = personB.monthlySurvivorPayment - (2/3 * personB.governmentPension)
    }
    //Don't let benefits be negative.
    if (personA.monthlySpousalPayment < 0) {personA.monthlySpousalPayment = 0}
    if (personA.monthlySurvivorPayment < 0) {personA.monthlySurvivorPayment = 0}
    if (personB.monthlySpousalPayment < 0) {personB.monthlySpousalPayment = 0}
    if (personB.monthlySurvivorPayment < 0) {personB.monthlySurvivorPayment = 0}
  }

  adjustSpousalAndSurvivorBenefitsForOwnEntitlement(personA:Person, personB:Person){
    //Adjust personA's spousal and survivor benefits for own entitlement if he/she has a retirement payment
    if (personA.monthlyRetirementPayment > 0){
      if (personA.retirementBenefit > personA.PIA){
        personA.monthlySpousalPayment = personA.monthlySpousalPayment - personA.retirementBenefit
      }
      else {
        personA.monthlySpousalPayment = personA.monthlySpousalPayment - personA.PIA
      }
      personA.monthlySurvivorPayment = personA.monthlySurvivorPayment - personA.retirementBenefit
    }
    //Adjust personB's spousal and survivor benefits for own entitlement if he/she has a retirement payment
    if (personB.monthlyRetirementPayment > 0){
      if (personB.retirementBenefit > personB.PIA){
        personB.monthlySpousalPayment = personB.monthlySpousalPayment - personB.retirementBenefit
      }
      else {
        personB.monthlySpousalPayment = personB.monthlySpousalPayment - personB.PIA
      }
      personB.monthlySurvivorPayment = personB.monthlySurvivorPayment - personB.retirementBenefit
    }
    //Don't let benefits be negative.
    if (personA.monthlySpousalPayment < 0) {personA.monthlySpousalPayment = 0}
    if (personA.monthlySurvivorPayment < 0) {personA.monthlySurvivorPayment = 0}
    if (personB.monthlySpousalPayment < 0) {personB.monthlySpousalPayment = 0}
    if (personB.monthlySurvivorPayment < 0) {personB.monthlySurvivorPayment = 0}
  }

  determineChildBenefitDate(scenario:CalculationScenario, child:Person, personA:Person, personB?:Person):MonthYearDate{
    let childBenefitDate:MonthYearDate
    if (scenario.maritalStatus == "single"){
      if (child.hasFiled === true){
        //assume child filed as early as possible (parent retirementBenefitDate)
        childBenefitDate = new MonthYearDate(personA.retirementBenefitDate)
      }
      else {//If child hasn't filed, find earliest retroactive childBenefitDate
        //If parent is not disabled, it's 6 months before today
        if (personA.isOnDisability === false){
          childBenefitDate = new MonthYearDate(this.today)
          childBenefitDate.setMonth(childBenefitDate.getMonth()-6)
        }
        else {//If parent is disabled, it's 12 months before today
        childBenefitDate = new MonthYearDate(this.today)
        childBenefitDate.setMonth(childBenefitDate.getMonth()-12)
        }
        //But no earlier than parent's retirementBenefitDate
        if (childBenefitDate < personA.retirementBenefitDate){
          childBenefitDate = new MonthYearDate(personA.retirementBenefitDate)
        }
      }
    }
    else {//i.e., it's a married or divorced scenario
      if (child.hasFiled === true){
        //assume they filed as early as possible (first retirementBenefitDate)
        childBenefitDate = new MonthYearDate(personA.retirementBenefitDate)
        if (personB.retirementBenefitDate < childBenefitDate){
          childBenefitDate = new MonthYearDate(personB.retirementBenefitDate)
        }
      }
      else {//If child hasn't filed, find earliest retroactive childBenefitDate based on each parent
        //find earliest date based on parentA
          if (personA.isOnDisability === false){//if personA is not disabled, it's 6 months ago. But no earlier than personA's retirementBenefitDate
            var earliestChildBenefitDateFromPersonA:MonthYearDate = new MonthYearDate(this.today)
            earliestChildBenefitDateFromPersonA.setMonth(earliestChildBenefitDateFromPersonA.getMonth()-6)
            if (earliestChildBenefitDateFromPersonA < personA.retirementBenefitDate){
              earliestChildBenefitDateFromPersonA = new MonthYearDate(personA.retirementBenefitDate)
            }
          }
          else {//if personA is disabled, it's 12 months ago. But no earlier than personA's fixedRetirementBenefitDate (i.e., their disability date)
            var earliestChildBenefitDateFromPersonA:MonthYearDate = new MonthYearDate(this.today)
            earliestChildBenefitDateFromPersonA.setMonth(earliestChildBenefitDateFromPersonA.getMonth()-12)
            if (earliestChildBenefitDateFromPersonA < personA.fixedRetirementBenefitDate){
              earliestChildBenefitDateFromPersonA = new MonthYearDate(personA.fixedRetirementBenefitDate)
            }
          }
        //find earliest date based on parentB
          if (personB.isOnDisability === false){//if personB is not disabled, it's 6 months ago. But no earlier than personB's retirementBenefitDate
            var earliestChildBenefitDateFromPersonB:MonthYearDate = new MonthYearDate(this.today)
            earliestChildBenefitDateFromPersonB.setMonth(earliestChildBenefitDateFromPersonB.getMonth()-6)
            if (earliestChildBenefitDateFromPersonB < personB.retirementBenefitDate){
              earliestChildBenefitDateFromPersonB = new MonthYearDate(personB.retirementBenefitDate)
            }
          }
          else {//if personB is disabled, it's 12 months ago. But no earlier than personB's fixedRetirementBenefitDate (i.e., their disability date)
            var earliestChildBenefitDateFromPersonB:MonthYearDate = new MonthYearDate(this.today)
            earliestChildBenefitDateFromPersonB.setMonth(earliestChildBenefitDateFromPersonB.getMonth()-12)
            if (earliestChildBenefitDateFromPersonB < personB.fixedRetirementBenefitDate){
              earliestChildBenefitDateFromPersonB = new MonthYearDate(personB.fixedRetirementBenefitDate)
            }
          }
        //childBenefitDate is earlier of those two dates
          if (earliestChildBenefitDateFromPersonA < earliestChildBenefitDateFromPersonB){
            childBenefitDate = new MonthYearDate(earliestChildBenefitDateFromPersonA)
          }
          else {
            childBenefitDate = new MonthYearDate(earliestChildBenefitDateFromPersonB)
          }
      }
    }
    //Don't let childBenefitDate be earlier than child's SSbirthDate
      if (childBenefitDate < child.SSbirthDate){
        childBenefitDate = new MonthYearDate(child.SSbirthDate)
      }
    return childBenefitDate
  }

  applyAssumedBenefitCut(scenario:CalculationScenario, calcYear:CalculationYear){
    if (scenario.benefitCutAssumption === true && calcYear.date.getFullYear() >= scenario.benefitCutYear && calcYear.date.getMonth() === 11) {
    //If there's a benefit cut assumption...
    //...and we've reached the year in question...
    //...and it's December (because we only want to apply this cut at the end of the year, given that it's a multiplication to annual sums)
      //Apply cut to sums included in PV calculation
      calcYear.annualBenefitSinglePersonAlive = calcYear.annualBenefitSinglePersonAlive * (1 - scenario.benefitCutPercentage/100)
      calcYear.annualBenefitSinglePersonDeceased = calcYear.annualBenefitSinglePersonDeceased * (1 - scenario.benefitCutPercentage/100)
      calcYear.annualBenefitBothAlive = calcYear.annualBenefitBothAlive * (1 - scenario.benefitCutPercentage/100)
      calcYear.annualBenefitOnlyPersonAalive = calcYear.annualBenefitOnlyPersonAalive * (1 - scenario.benefitCutPercentage/100)
      calcYear.annualBenefitOnlyPersonBalive = calcYear.annualBenefitOnlyPersonBalive * (1 - scenario.benefitCutPercentage/100)
      //Apply cut to sums included in output table
      calcYear.tablePersonAannualRetirementBenefit = calcYear.tablePersonAannualRetirementBenefit * (1 - scenario.benefitCutPercentage/100)
      calcYear.tablePersonAannualSpousalBenefit = calcYear.tablePersonAannualSpousalBenefit * (1 - scenario.benefitCutPercentage/100)
      calcYear.tablePersonAannualSurvivorBenefit = calcYear.tablePersonAannualSurvivorBenefit * (1 - scenario.benefitCutPercentage/100)
      calcYear.tablePersonBannualRetirementBenefit = calcYear.tablePersonBannualRetirementBenefit * (1 - scenario.benefitCutPercentage/100)
      calcYear.tablePersonBannualSpousalBenefit = calcYear.tablePersonBannualSpousalBenefit * (1 - scenario.benefitCutPercentage/100)
      calcYear.tablePersonBannualSurvivorBenefit = calcYear.tablePersonBannualSurvivorBenefit * (1 - scenario.benefitCutPercentage/100)
      calcYear.tableTotalAnnualChildBenefitsSingleParentAlive = calcYear.tableTotalAnnualChildBenefitsSingleParentAlive * (1 - scenario.benefitCutPercentage/100)
      calcYear.tableTotalAnnualChildBenefitsSingleParentDeceased = calcYear.tableTotalAnnualChildBenefitsSingleParentDeceased * (1 - scenario.benefitCutPercentage/100)
      calcYear.tableTotalAnnualChildBenefitsBothParentsAlive = calcYear.tableTotalAnnualChildBenefitsBothParentsAlive * (1 - scenario.benefitCutPercentage/100)
      calcYear.tableTotalAnnualChildBenefitsBothParentsDeceased = calcYear.tableTotalAnnualChildBenefitsBothParentsDeceased * (1 - scenario.benefitCutPercentage/100)
      calcYear.tableTotalAnnualChildBenefitsOnlyPersonAalive = calcYear.tableTotalAnnualChildBenefitsOnlyPersonAalive * (1 - scenario.benefitCutPercentage/100)
      calcYear.tableTotalAnnualChildBenefitsOnlyPersonBalive = calcYear.tableTotalAnnualChildBenefitsOnlyPersonBalive * (1 - scenario.benefitCutPercentage/100)
    }
  }

  
  calculateMonthlyPaymentsSingle(scenario:CalculationScenario, calcYear:CalculationYear, person:Person, personAliveBoolean:boolean){
    //Reset monthlyPayment fields
    person.monthlyRetirementPayment = 0
    for (let child of scenario.children){
      child.monthlyChildPayment = 0
    }

    //Check whether person is entitled to noncovered pension
    if (person.entitledToNonCoveredPension === false){
      if (calcYear.date >= person.nonCoveredPensionDate){
        person.entitledToNonCoveredPension = true
      }
    }

    let personSuspended:boolean

    if (personAliveBoolean === true){
      //determine if person is suspended
      if (person.beginSuspensionDate > calcYear.date || person.endSuspensionDate <= calcYear.date){
        personSuspended = false
      }
      else {
        personSuspended = true
      }
      if (calcYear.date >= person.retirementBenefitDate) {//if person has filed for benefits...
        if (personSuspended === true){//if person has suspended benefits...
          person.DRCsViaSuspension = person.DRCsViaSuspension + 1
          person.monthlyRetirementPayment = 0
          for (let child of scenario.children){
            child.monthlyChildPayment = 0
          }
        }
        else {//i.e., person isn't suspended
          person.monthlyRetirementPayment = person.retirementBenefit
          for (let child of scenario.children){
            if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
              if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                child.monthlyChildPayment = person.PIA * 0.5
              }
            }
          }
        }
      }
    }
    else {//if we're assuming person is deceased
      for (let child of scenario.children){
        if (child.age < 17.99 || child.isOnDisability === true){//Use 17.99 as the cutoff because sometimes when child is actually 18 javascript value will be 17.9999999
          if (person.eligibleForNonCoveredPension === false){
            child.monthlyChildPayment = person.PIA * 0.75
          }
          else {
            child.monthlyChildPayment = person.nonWEP_PIA * 0.75
          }
        }
      }
    }
  }

  //Calculates "original benefit" amounts (i.e., amounts that go into family max math -- so spousal/survivor benefits not yet reduced for family max, own entitlement, age, or GPO)
  calculateMonthlyPaymentsCouple(scenario:CalculationScenario, calcYear:CalculationYear, personA:Person, personAaliveBoolean:boolean, personB:Person, personBaliveBoolean:boolean){
    //Note that we're making no distinction in this function for whether it's a married or divorced scenario.

    //Set all benefits to zero to begin
      personA.monthlyRetirementPayment = 0
      personA.monthlySpousalPayment = 0
      personA.monthlySurvivorPayment = 0
      personB.monthlyRetirementPayment = 0
      personB.monthlySpousalPayment = 0
      personB.monthlySurvivorPayment = 0
      for (let child of scenario.children){child.monthlyChildPayment = 0}

    //Check whether a person's retirement benefit begins this month
      if (personA.entitledToRetirement === false){
        if (calcYear.date >= personA.retirementBenefitDate){
          personA.entitledToRetirement = true
        }
      }
      if (personB.entitledToRetirement === false){
        if (calcYear.date >= personB.retirementBenefitDate){
          personB.entitledToRetirement = true
        }
      }

    //determine if personA and/or personB are suspended
      let personAsuspended:boolean = false
      let personBsuspended:boolean = false
      if (personA.suspendingBenefits === true){
        if (personA.endSuspensionDate <= calcYear.date || personA.beginSuspensionDate > calcYear.date) {personAsuspended = false}
        else {personAsuspended = true}
      }
      if (personB.suspendingBenefits === true){
        if (personB.endSuspensionDate <= calcYear.date || personB.beginSuspensionDate > calcYear.date) {personBsuspended = false}
        else {personBsuspended = true}
      }

    //Check whether personA or personB entitled to noncovered pension
      if (personA.entitledToNonCoveredPension === false){
        if (calcYear.date >= personA.nonCoveredPensionDate){
          personA.entitledToNonCoveredPension = true
        }
      }
      if (personB.entitledToNonCoveredPension === false){
        if (calcYear.date >= personB.nonCoveredPensionDate){
          personB.entitledToNonCoveredPension = true
        }
      }

    //calculate payments
      //both personA and personB alive
      if (personAaliveBoolean === true && personBaliveBoolean === true){
          if (personAsuspended === true && personBsuspended === true){//if both people are suspended
              personA.DRCsViaSuspension = personA.DRCsViaSuspension + 1//We only add to this field in the "assuming both are alive" section. Could do it in any of the mortality assumption sections, but we only want to do it once for a given month.
              personB.DRCsViaSuspension = personB.DRCsViaSuspension + 1//We only add to this field in the "assuming both are alive" section. Could do it in any of the mortality assumption sections, but we only want to do it once for a given month.
              //Nobody gets any payments. Don't have to set to zero though because that's already done.
          }
          else if (personAsuspended === true && personBsuspended === false){//if only personA is suspended
            personA.DRCsViaSuspension = personA.DRCsViaSuspension + 1
            //if entitled to benefits in question: personB gets retirement benefit, children each get child benefit on personB (personA gets nothing)
            if (personB.entitledToRetirement === true){
              personB.monthlyRetirementPayment = personB.retirementBenefit
              for (let child of scenario.children){
                if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
                  if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                    child.monthlyChildPayment = personB.PIA * 0.5
                  }
                }
              }
            }
          }
          else if (personAsuspended === false && personBsuspended === true){//if only personB is suspended
            personB.DRCsViaSuspension = personB.DRCsViaSuspension + 1
            //if entitled to benefits in question: personA gets retirement benefit, children each get child benefit on personA (personB gets nothing)
            if (personA.entitledToRetirement === true){
              personA.monthlyRetirementPayment = personA.retirementBenefit
              for (let child of scenario.children){
                if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
                  if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                    child.monthlyChildPayment = personA.PIA * 0.5
                  }
                }
              }
            }
          }
          else {//if neither person is suspended
            //if entitled to benefits in question: personA gets retirement and spousal, personB gets retirement and spousal and children each get benefit on personA or personB
            let childUnder16orDisabled:boolean = this.birthdayService.checkForChildUnder16orDisabled(scenario)
            //personA
            if (personA.entitledToRetirement === true){
              personA.monthlyRetirementPayment = personA.retirementBenefit
            }
            if( (personA.PIA < 0.5 * personB.PIA || personA.entitledToRetirement === false) && //if personA has PIA less than 50% of personB's PIA or is not yet entitled to a retirement benefit, AND
              ( calcYear.date >= personA.spousalBenefitDate || (personB.entitledToRetirement === true && childUnder16orDisabled === true && personA.childInCareSpousal === true) )){//personA has reached spousalBenefitDate OR personB has started retirement benefit and there is a childUnder16orDisabled and personA.childInCareSpousal is true
                personA.monthlySpousalPayment = this.calculateSpousalOriginalBenefit(personB)
            }
            //personB
            if (personB.entitledToRetirement === true){
              personB.monthlyRetirementPayment = personB.retirementBenefit
            }
            if( (personB.PIA < 0.5 * personA.PIA || personB.entitledToRetirement === false) && //if personB has PIA less than 50% of personA's PIA or is not yet entitled to a retirement benefit, AND
              ( calcYear.date >= personB.spousalBenefitDate || (personA.entitledToRetirement === true && childUnder16orDisabled === true && personB.childInCareSpousal === true) )){//personB has reached spousalBenefitDate OR personA has started retirement benefit and there is a childUnder16orDisabled and personB.childInCareSpousal is true
              personB.monthlySpousalPayment = this.calculateSpousalOriginalBenefit(personA)
            }
            //children
            for (let child of scenario.children){
              if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
                if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                    if (personA.entitledToRetirement === true && personB.entitledToRetirement === true){//If both spouses have started benefits, it's 50% of higher PIA
                      child.monthlyChildPayment = (personA.PIA > personB.PIA) ? personA.PIA * 0.5 : personB.PIA * 0.5
                    }
                    else if (personA.entitledToRetirement === true){//both hadn't been met, but personA's date has been met
                      child.monthlyChildPayment = personA.PIA * 0.5
                    }
                    else {//i.e., childBenefitDate has been met (which means at least one spouse's retirementBenefitDate has been met), but it wasn't personA's date
                      child.monthlyChildPayment = personB.PIA * 0.5
                    }
                }
              }
            }
          }
      }
      //personA alive, personB deceased
      else if (personAaliveBoolean === true && personBaliveBoolean === false){
          if (personAsuspended === true){//if personA is suspended
              //if entitled to benefits in question: children get survivor benefit on personB (personA gets nothing)
              for (let child of scenario.children){
                if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
                  if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                    if (personB.eligibleForNonCoveredPension === false){
                      child.monthlyChildPayment = personB.PIA * 0.75//No need to do any check based on personB dates. If we're assuming they're deceased, children are eligible (assuming <18 or disabled)
                    }
                    else {
                      child.monthlyChildPayment = personB.nonWEP_PIA * 0.75
                    }
                  }
                }
              }
          }
          else {//if personA is not suspended
              //if entitled to benefits in question: personA gets retirement and survivor, children get benefit on personA or survivor benefit on personB
              if (personA.entitledToRetirement === true){
                personA.monthlyRetirementPayment = personA.retirementBenefit
              }
              if (calcYear.date >= personA.survivorFRA){
                personA.monthlySurvivorPayment = this.calculateSurvivorOriginalBenefit(personB)
              }
              for (let child of scenario.children){
                if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
                  if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                    if (personA.entitledToRetirement === true){
                      if (personB.eligibleForNonCoveredPension === false){
                        child.monthlyChildPayment = (personA.PIA * 0.5 > personB.PIA * 0.75) ? personA.PIA * 0.5 : personB.PIA * 0.75
                      }
                      else {
                        child.monthlyChildPayment = (personA.PIA * 0.5 > personB.nonWEP_PIA * 0.75) ? personA.PIA * 0.5 : personB.nonWEP_PIA * 0.75
                      }
                    }
                    else {
                      if (personB.eligibleForNonCoveredPension === false){
                        child.monthlyChildPayment = personB.PIA * 0.75//No need to do any check based on personB dates. If we're assuming they're deceased, children are eligible (assuming <18 or disabled)
                      }
                      else {
                        child.monthlyChildPayment = personB.nonWEP_PIA
                      }
                    }
                  }
                }
              }
          }
      }
      //personA deceased, personB alive
      else if (personAaliveBoolean === false && personBaliveBoolean === true){
          if (personBsuspended === true){//if personB is suspended
              //if entitled to benefits in question: children get survivor benefit on personA (personB gets nothing)
              for (let child of scenario.children){
                if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
                  if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                    if (personA.eligibleForNonCoveredPension === false){
                      child.monthlyChildPayment = personA.PIA * 0.75//No need to do any check based on personA dates. If we're assuming they're deceased, children are eligible (assuming <18 or disabled)
                    }
                    else {
                      child.monthlyChildPayment = personA.nonWEP_PIA * 0.75
                    }
                  }
                }
              }
          }
          else{//if personB is not suspended
              //if entitled to benefits in question: personB gets retirement and survivor, children get benefit on personB or survivor benefit on personA
              if (personB.entitledToRetirement === true){
                personB.monthlyRetirementPayment = personB.retirementBenefit
              }
              if (calcYear.date >= personB.survivorFRA){
                personB.monthlySurvivorPayment = this.calculateSurvivorOriginalBenefit(personA)
              }
              for (let child of scenario.children){
                if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
                  if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                    if (personB.entitledToRetirement === true){
                      if (personA.eligibleForNonCoveredPension === false){
                        child.monthlyChildPayment = (personA.PIA * 0.75 > personB.PIA * 0.5) ? personA.PIA * 0.75 : personB.PIA * 0.5
                      }
                      else {
                        child.monthlyChildPayment = (personA.nonWEP_PIA * 0.75 > personB.PIA * 0.5) ? personA.nonWEP_PIA * 0.75 : personB.PIA * 0.5
                      }
                    }
                    else {
                      if (personA.eligibleForNonCoveredPension === false){
                        child.monthlyChildPayment = personA.PIA * 0.75//No need to do any check based on personA dates. If we're assuming they're deceased, children are eligible (assuming <18 or disabled)
                      }
                      else {
                        child.monthlyChildPayment = personA.nonWEP_PIA * 0.75
                      }
                    }
                  }
                }
              }
          }
        }
      else {//both deceased
          //if entitled to benefits in question: children get survivor benefit on personA or personB
          for (let child of scenario.children){
            if (child.age < 17.99 || child.isOnDisability === true){//if child is eligible for a benefit...
              if (calcYear.date >= child.childBenefitDate){//child gets a benefit if we have reached his/her childBenefitDate
                if (personA.eligibleForNonCoveredPension === false && personB.eligibleForNonCoveredPension === false){
                  child.monthlyChildPayment = (personA.PIA > personB.PIA) ? personA.PIA * 0.75 : personB.PIA * 0.75
                }
                else if (personA.eligibleForNonCoveredPension === true && personB.eligibleForNonCoveredPension === false){
                  child.monthlyChildPayment = (personA.nonWEP_PIA > personB.PIA) ? personA.nonWEP_PIA * 0.75 : personB.PIA * 0.75
                }
                else if (personA.eligibleForNonCoveredPension === false && personB.eligibleForNonCoveredPension === true){
                  child.monthlyChildPayment = (personA.PIA > personB.nonWEP_PIA) ? personA.PIA * 0.75 : personB.nonWEP_PIA * 0.75
                }
                else {
                  child.monthlyChildPayment = (personA.nonWEP_PIA > personB.nonWEP_PIA) ? personA.nonWEP_PIA * 0.75 : personB.nonWEP_PIA * 0.75
                }
                //No need to do any check based on parent dates. If we're assuming they're deceased, children are eligible (assuming <18 or disabled)
              }
            }
          }
      }
      //Save currently payment amounts as child.originalBenefit field, for sake of making sure family max never results in benefit greater than original benefit
      for (let child of scenario.children){
        child.originalBenefit = child.monthlyChildPayment
      }
  }

  monthlyCheckForBenefitRecalculationsSingle(person:Person, calcYear:CalculationYear){
    this.checkIfWEPbeginsThisMonthAndRecalcAsNecessary(person, calcYear.date)
    //At FRA, recalculate retirementBenefit using adjusted date
    if (calcYear.date.valueOf() == person.FRA.valueOf()){
      person.adjustedRetirementBenefitDate.setMonth(person.retirementBenefitDate.getMonth()+person.retirementARFcreditingMonths)
      person.retirementBenefit = this.calculateRetirementBenefit(person, person.adjustedRetirementBenefitDate)
      //Also at FRA, if person is disabled, recalculate family maximum using normal retirement family maximum rules rather than disability ("DMAX") rules. (See https://secure.ssa.gov/apps10/poms.nsf/lnx/0300615742)
      if (person.isOnDisability === true){
        this.familyMaximumService.calculateFamilyMaximum(person, calcYear.date)
      }
    }
    //Recalculate retirementBenefit using DRCs at endSuspensionDate
    if (calcYear.date.valueOf() == person.endSuspensionDate.valueOf()){
      person.retirementBenefit = this.calculateRetirementBenefit(person, person.adjustedRetirementBenefitDate)
    }
  }

  monthlyCheckForBenefitRecalculationsCouple(personA:Person, personB:Person, calcYear:CalculationYear){
    this.checkIfWEPbeginsThisMonthAndRecalcAsNecessary(personA, calcYear.date)
    this.checkIfWEPbeginsThisMonthAndRecalcAsNecessary(personB, calcYear.date)
    //Calculate retirementBenefit field if it hasn't been done yet
    if (personA.retirementBenefit == 0) {
      personA.retirementBenefit = this.calculateRetirementBenefit(personA, personA.retirementBenefitDate)
    }
    if (personB.retirementBenefit == 0) {
      personB.retirementBenefit = this.calculateRetirementBenefit(personB, personB.retirementBenefitDate)
    }

    //At personA's FRA...
    if (calcYear.date.valueOf() == personA.FRA.valueOf()){
      //Recalculate person's own retirement benefit using adjusted date at FRA. Also set adjustedSpousalBenefitDate field.
      if (personA.retirementBenefitDate < personA.FRA){//This conditional is because we only want to calculate these things at FRA if person filed prior to FRA. If person hasn't hit retirementBenefitDate yet, we don't want to calculate it yet.
        personA.adjustedRetirementBenefitDate.setMonth(personA.retirementBenefitDate.getMonth()+personA.retirementARFcreditingMonths)
        personA.adjustedSpousalBenefitDate.setMonth(personA.adjustedSpousalBenefitDate.getMonth()+personA.spousalARFcreditingMonths)
        personA.retirementBenefit = this.calculateRetirementBenefit(personA, personA.adjustedRetirementBenefitDate)
      }
      //If personA is disabled, recalculate family maximum using normal retirement family maximum rules rather than disability ("DMAX") rules. (See https://secure.ssa.gov/apps10/poms.nsf/lnx/0300615742)
      if (personA.isOnDisability === true){
        this.familyMaximumService.calculateFamilyMaximum(personA, calcYear.date)
      }
    }
    //At personB's FRA...
    if (calcYear.date.valueOf() == personB.FRA.valueOf()){
      //Recalculate person's own retirement benefit using adjusted date at FRA. Also set adjustedSpousalBenefitDate field.
      if (personB.retirementBenefitDate < personB.FRA){//Second conditional is because we only want to calculate these things at FRA if person filed prior to FRA. If person hasn't hit retirementBenefitDate yet, we don't want to calculate it yet.
        personB.adjustedRetirementBenefitDate.setMonth(personB.retirementBenefitDate.getMonth()+personB.retirementARFcreditingMonths)
        personB.adjustedSpousalBenefitDate.setMonth(personB.adjustedSpousalBenefitDate.getMonth()+personB.spousalARFcreditingMonths)
        personB.retirementBenefit = this.calculateRetirementBenefit(personB, personB.adjustedRetirementBenefitDate)
      }
      //If personB is disabled, recalculate family maximum using normal retirement family maximum rules rather than disability ("DMAX") rules. (See https://secure.ssa.gov/apps10/poms.nsf/lnx/0300615742)
      if (personB.isOnDisability === true){
        this.familyMaximumService.calculateFamilyMaximum(personB, calcYear.date)
      }
    }

    //Recalculate retirement benefit using DRCs at endSuspensionDate\
    if (calcYear.date.valueOf() == personA.endSuspensionDate.valueOf()){
      personA.retirementBenefit = this.calculateRetirementBenefit(personA, personA.adjustedRetirementBenefitDate)
    }
    if (calcYear.date.valueOf() == personB.endSuspensionDate.valueOf()){
      personB.retirementBenefit = this.calculateRetirementBenefit(personB, personB.adjustedRetirementBenefitDate)
    }
  }

  checkIfWEPbeginsThisMonthAndRecalcAsNecessary(person:Person, date:MonthYearDate){
    //Do same "entitled" check as in checkWhichPIAtoUse(), and set PIA in same way
    if (person.eligibleForNonCoveredPension === true && person.entitledToNonCoveredPension === false){//We do "entitled = false" check because we don't want to keep running this for no reason every month after pension has begun
      if (person.nonCoveredPensionDate <= date){//i.e., noncovered pension has begun
        person.entitledToNonCoveredPension = true
        //set person.PIA equal to their WEP PIA (until now, PIA field was equal to non-WEP PIA)
        person.PIA = person.WEP_PIA
        //If we haven't reached FRA, do regular retirementBenefit recalculation. If we have, recalculate using ARF-adjusted benefit date.
        if (date < person.FRA){
          person.retirementBenefit = this.calculateRetirementBenefit(person, person.retirementBenefitDate)
        }
        else {
          person.retirementBenefit = this.calculateRetirementBenefit(person, person.adjustedRetirementBenefitDate)
          //If we have reached endSuspensionDate, this will automatically include person's DRCs from suspension
        }
        //Recalculate family maximum with new PIA
        this.familyMaximumService.calculateFamilyMaximum(person, date)
      }
    }
  }
  
}
