import {TestBed, inject} from '@angular/core/testing'
import {InputValidationService} from './inputvalidation.service'
import {Person} from './data model classes/person'
import {CalculationScenario} from './data model classes/calculationscenario'
import {BirthdayService} from './birthday.service'
import {MonthYearDate} from "./data model classes/monthyearDate"

describe('InputvalidationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InputValidationService]
    });
  });

  it('should be created', inject([InputValidationService], (service: InputValidationService) => {
    expect(service).toBeTruthy();
  }));


  //Check checkValidRetirementInputs()
  it('should give no error message when input date is good', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate(2023, 7, 1)
    expect(service.checkValidRetirementInput(scenario, person, retirementBenefitDate))
      .toEqual(undefined)
  }))

  it('should demand a date when user fails to input one', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate(undefined, 1, 0)
    expect(service.checkValidRetirementInput(scenario, person, retirementBenefitDate))
      .toEqual("Please enter a date.")
  }))

  it('should reject retirementBenefitDate that is too early', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2022, 11, 1) //62 years and 0 months (not possible for somebody born on not first or second of month)
    expect(service.checkValidRetirementInput(scenario, person, retirementBenefitDate))
      .toEqual("Please enter a later date. A person cannot file for retirement benefits before the first month in which they are 62 for the entire month.")
  }))

  it('should reject retirementBenefitDate that is later than 70', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2031, 0, 1) //70 years and 1 month
    expect(service.checkValidRetirementInput(scenario, person, retirementBenefitDate))
      .toEqual("Please enter an earlier date. You do not want to wait beyond age 70.")
  }))

  it('should allow retroactive retirementBenefitDate if after FRA and no more than 6 months ago', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let scenario:CalculationScenario = new CalculationScenario()
    let person:Person = new Person("A")
    service.today = new MonthYearDate(2018, 10)//November 2018 (date when writing test) so that it doesn't fail in future
    person.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    person.SSbirthDate = new MonthYearDate (1952, 8)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2018, 9) //only 1 month in the past, after FRA
    expect(service.checkValidRetirementInput(scenario, person, retirementBenefitDate))
      .toEqual(undefined)
  }))

  it('should reject retirementBenefitDate that is more than 6 months ago, even if after FRA', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let scenario:CalculationScenario = new CalculationScenario()
    let person:Person = new Person("A")
    service.today = new MonthYearDate(2018, 10)//November 2018 (date when writing test)
    person.actualBirthDate = new Date (1952, 2, 29) //March 30, 1952
    person.SSbirthDate = new MonthYearDate (1952, 2)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2018, 3) //after FRA, but more than 6 months ago
    expect(service.checkValidRetirementInput(scenario, person, retirementBenefitDate))
      .toEqual("The effective date for a retroactive application for retirement benefits must be no earlier than your full retirement age and no more than 6 months before today.")
  }))

  it('should reject retirementBenefitDate that prior to FRA, even if no more than 6 months ago', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let scenario:CalculationScenario = new CalculationScenario()
    let person:Person = new Person("A")
    service.today = new MonthYearDate(2018, 10)//November 2018 (date when writing test)
    person.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    person.SSbirthDate = new MonthYearDate (1952, 8)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2018, 7) //only 3 months ago, but before FRA
    expect(service.checkValidRetirementInput(scenario, person, retirementBenefitDate))
      .toEqual("The effective date for a retroactive application for retirement benefits must be no earlier than your full retirement age and no more than 6 months before today.")
  }))

  //Check checkValidSpousalInputs()
  it('should give no error message when input dates are good', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    person.FRA = new MonthYearDate (2027, 11, 1) //67 years
    otherPerson.actualBirthDate = new Date (1958, 5, 3) //June 4, 1958
    otherPerson.SSbirthDate = new MonthYearDate (1958, 5, 1)
    let ownRetirementBenefitDate:MonthYearDate = new MonthYearDate(2026, 11, 1) //own retirement at 66 years 0 months
    let spousalBenefitDate:MonthYearDate = new MonthYearDate(2026, 11, 1) //own spousal at 66 years 0 months
    let otherSpouseRetirementBenefitDate:MonthYearDate = new MonthYearDate(2022, 7, 1) //Before the attempted own spousal date, so that it's not a problem
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, ownRetirementBenefitDate, spousalBenefitDate, otherSpouseRetirementBenefitDate))
      .toEqual(undefined)
  }))

  it('should reject spousalBenefitDate that is prior to age 62', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    person.FRA = new MonthYearDate (2027, 11, 1) //67 years
    otherPerson.actualBirthDate = new Date (1958, 5, 3) //June 4, 1958
    otherPerson.SSbirthDate = new MonthYearDate (1958, 5, 1)
    let ownRetirementBenefitDate:MonthYearDate = new MonthYearDate(2026, 11, 1) //own retirement at 66 years 0 months
    let spousalBenefitDate:MonthYearDate = new MonthYearDate(2022, 10, 1) //own spousal at 61 years 11 months
    let otherSpouseRetirementBenefitDate:MonthYearDate = new MonthYearDate(2022, 7, 1) //Before the attempted own spousal date, so that *this* isn't the problem
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, ownRetirementBenefitDate, spousalBenefitDate, otherSpouseRetirementBenefitDate))
      .toEqual("Please enter a later date. A person cannot file for spousal benefits before the first month in which they are 62 for the entire month.")
  }))

  it('should reject spousalBenefitDate that is prior to other spouse retirementBenefitDate', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    person.FRA = new MonthYearDate (2027, 11, 1) //67 years
    otherPerson.actualBirthDate = new Date (1962, 5, 3) //June 4, 1962
    otherPerson.SSbirthDate = new MonthYearDate (1962, 5, 1)
    let ownRetirementBenefitDate:MonthYearDate = new MonthYearDate(2026, 11, 1) //own retirement at 66 years 0 months
    let spousalBenefitDate:MonthYearDate = new MonthYearDate(2026, 11, 1) //own spousal at 66 years 0 months
    let otherSpouseRetirementBenefitDate:MonthYearDate = new MonthYearDate(2031, 11, 1) //After the attempted own spousal date
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, ownRetirementBenefitDate, spousalBenefitDate, otherSpouseRetirementBenefitDate))
      .toEqual("A person cannot start spousal benefits before the other spouse has filed for his/her own retirement benefit.")
  }))

  it('should reject spousalBenefitDate that is later than later of the two retirementBenefitDates', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    person.FRA = new MonthYearDate (2027, 11, 1) //67 years
    otherPerson.actualBirthDate = new Date (1962, 5, 3) //June 4, 1962
    otherPerson.SSbirthDate = new MonthYearDate (1962, 5, 1)
    let ownRetirementBenefitDate:MonthYearDate = new MonthYearDate(2026, 11, 1) //own retirement at 66 years 0 months
    let spousalBenefitDate:MonthYearDate = new MonthYearDate(2032, 0, 1) //own spousal at 66 years 0 months
    let otherSpouseRetirementBenefitDate:MonthYearDate = new MonthYearDate(2031, 11, 1) //After the attempted own spousal date
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, ownRetirementBenefitDate, spousalBenefitDate, otherSpouseRetirementBenefitDate))
      .toEqual("Per new deemed filing rules, a person's spousal benefit date must be the later of their own retirement benefit date, or their spouse's retirement benefit date.")
  }))

  it('should reject spousalBenefitDate that is later than later of the two retirementBenefitDates, for divorcee', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "divorced"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    person.actualBirthDate = new Date (1960, 11, 29) //December 30, 1960
    person.SSbirthDate = new MonthYearDate (1960, 11, 1)
    person.FRA = new MonthYearDate (2027, 11, 1) //67 years
    otherPerson.actualBirthDate = new Date (1962, 5, 3) //June 4, 1962
    otherPerson.SSbirthDate = new MonthYearDate (1962, 5, 1)
    let ownRetirementBenefitDate:MonthYearDate = new MonthYearDate(2026, 11, 1) //own retirement at 66 years 0 months
    let spousalBenefitDate:MonthYearDate = new MonthYearDate(2032, 0, 1) //own spousal at 66 years 0 months
    let otherSpouseRetirementBenefitDate:MonthYearDate = new MonthYearDate(2031, 11, 1) //After the attempted own spousal date
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, ownRetirementBenefitDate, spousalBenefitDate, otherSpouseRetirementBenefitDate))
      .toEqual("Per new deemed filing rules, your spousal benefit date must be the later of your retirement benefit date, or the first month in which your ex-spouse is 62 for the entire month.")
  }))

  it('should reject restricted app prior to FRA -- ie spousalBenefitDate prior to FRA for somebody born 1953 or prior ', inject([InputValidationService], (service: InputValidationService) => {
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    person.actualBirthDate = new Date (1953, 4, 29) //May 30, 1953
    person.SSbirthDate = new MonthYearDate (1953, 4, 1)
    person.FRA = new MonthYearDate (2019, 4, 1) //66 years
    otherPerson.actualBirthDate = new Date (1954, 4, 3) //May 4, 1954
    otherPerson.SSbirthDate = new MonthYearDate (1954, 4, 1)
    let ownRetirementBenefitDate:MonthYearDate = new MonthYearDate(2023, 4, 1) //own retirement at 70 years 0 months
    let spousalBenefitDate:MonthYearDate = new MonthYearDate(2017, 4, 1) //own spousal at 64 years 0 months (prior to FRA)
    let otherSpouseRetirementBenefitDate:MonthYearDate = new MonthYearDate(2017, 3, 1) //Prior to attempted ownSpousalBenefitDate, so that *this* isn't the problem
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, ownRetirementBenefitDate, spousalBenefitDate, otherSpouseRetirementBenefitDate))
      .toEqual("A person cannot file a restricted application (i.e., application for spousal-only) prior to their FRA.")
  }))

  it('should allow retroactive spousal date if after FRA and no more than 6 months ago', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    service.today = new MonthYearDate(2018, 10)//November 2018 (date when writing test) so that it doesn't fail in future
    person.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    person.SSbirthDate = new MonthYearDate (1952, 8)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    otherPerson.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    otherPerson.SSbirthDate = new MonthYearDate (1952, 8)
    otherPerson.FRA = birthdayService.findFRA(otherPerson.SSbirthDate)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2018, 9) //only 1 month in the past, after FRA
    let spousalBenefitDate:MonthYearDate = new MonthYearDate (2018, 9) //only 1 month in the past, after FRA
    let otherPersonRetirementBenefitDate:MonthYearDate = new MonthYearDate (2016, 9) //filed Oct 2016
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, retirementBenefitDate, spousalBenefitDate, otherPersonRetirementBenefitDate))
      .toEqual(undefined)
  }))

  it('should allow retroactive spousal date if after FRA and 8 months ago because other person is disabled', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    otherPerson.isOnDisability = true
    service.today = new MonthYearDate(2018, 10)//November 2018 (date when writing test) so that it doesn't fail in future
    person.actualBirthDate = new Date (1952, 1, 29) //Feb 30, 1952
    person.SSbirthDate = new MonthYearDate (1952, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    otherPerson.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    otherPerson.SSbirthDate = new MonthYearDate (1952, 8)
    otherPerson.FRA = birthdayService.findFRA(otherPerson.SSbirthDate)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2018, 2) //8 months in the past, after FRA
    let spousalBenefitDate:MonthYearDate = new MonthYearDate (2018, 2) //8 months in the past, after FRA
    let otherPersonRetirementBenefitDate:MonthYearDate = new MonthYearDate (2016, 9) //filed Oct 2016
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, retirementBenefitDate, spousalBenefitDate, otherPersonRetirementBenefitDate))
      .toEqual(undefined)
  }))

  it('should reject retroactive spousal date if after FRA but more than 6 months ago', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    service.today = new MonthYearDate(2018, 10)//November 2018 (date when writing test) so that it doesn't fail in future
    person.actualBirthDate = new Date (1952, 2, 29) //March 30, 1952
    person.SSbirthDate = new MonthYearDate (1952, 2)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    otherPerson.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    otherPerson.SSbirthDate = new MonthYearDate (1952, 8)
    otherPerson.FRA = birthdayService.findFRA(otherPerson.SSbirthDate)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2018, 3)
    let spousalBenefitDate:MonthYearDate = new MonthYearDate (2018, 3) //after FRA, but 7 months ago
    let otherPersonRetirementBenefitDate:MonthYearDate = new MonthYearDate (2016, 9) //filed Oct 2016
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, retirementBenefitDate, spousalBenefitDate, otherPersonRetirementBenefitDate))
      .toEqual("The effective date for a retroactive application for spousal benefits must be no earlier than your full retirement age and no more than 6 months before today (12 months if your spouse/ex-spouse is disabled).")
  }))

  it('should reject retroactive spousal date if less than 6 months ago but before FRA', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let scenario:CalculationScenario = new CalculationScenario()
    scenario.maritalStatus = "married"
    let person:Person = new Person("A")
    let otherPerson:Person = new Person("B")
    service.today = new MonthYearDate(2018, 10)//November 2018 (date when writing test) so that it doesn't fail in future
    person.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    person.SSbirthDate = new MonthYearDate (1952, 8)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    otherPerson.actualBirthDate = new Date (1952, 8, 29) //Sept 30, 1952
    otherPerson.SSbirthDate = new MonthYearDate (1952, 8)
    otherPerson.FRA = birthdayService.findFRA(otherPerson.SSbirthDate)
    let retirementBenefitDate:MonthYearDate = new MonthYearDate (2018, 7)
    let spousalBenefitDate:MonthYearDate = new MonthYearDate (2018, 7) //only 3 months ago, but before FRA
    let otherPersonRetirementBenefitDate:MonthYearDate = new MonthYearDate (2016, 9) //filed Oct 2016
    expect(service.checkValidSpousalInput(scenario, person, otherPerson, retirementBenefitDate, spousalBenefitDate, otherPersonRetirementBenefitDate))
      .toEqual("The effective date for a retroactive application for spousal benefits must be no earlier than your full retirement age and no more than 6 months before today (12 months if your spouse/ex-spouse is disabled).")
  }))

  //Testing checkValidBeginSuspensionInput()
  it('should reject beginSuspensionDate that is prior to FRA', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1953, 4, 29) //May 30, 1953
    person.SSbirthDate = new MonthYearDate (1953, 4, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    person.beginSuspensionDate = new MonthYearDate(2019, 3, 1)
    expect(service.checkValidBeginSuspensionInput(person))
      .toEqual("It is not possible to suspend benefits prior to full retirement age.")
  }))

  it('should reject beginSuspensionDate that is in the past', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1950, 4, 29) //May 30, 1950
    person.SSbirthDate = new MonthYearDate (1950, 4, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    person.beginSuspensionDate = new MonthYearDate(2018, 3, 1)
    expect(service.checkValidBeginSuspensionInput(person))
      .toEqual("Please enter a date no earlier than today.")
  }))

  it('should reject beginSuspensionDate that is prior to fixedRetirementBenefitDate', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1960, 4, 29)
    person.SSbirthDate = new MonthYearDate (1960, 4, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    person.fixedRetirementBenefitDate = new MonthYearDate(2028, 1, 1) //Feb 2018
    person.beginSuspensionDate = new MonthYearDate(2027, 5, 1)
    expect(service.checkValidBeginSuspensionInput(person))
      .toEqual("It is not possible to suspend a retirement benefit prior to having filed for that retirement benefit.")
  }))

  it('should give no error message when beginSuspensionDate is a valid choice', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1956, 4, 29)
    person.SSbirthDate = new MonthYearDate (1956, 4, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    person.fixedRetirementBenefitDate = new MonthYearDate(2018, 6, 1) //July 2018
    person.beginSuspensionDate = new MonthYearDate(2025, 3, 1)
    expect(service.checkValidBeginSuspensionInput(person))
      .toBeUndefined()
  }))


  //Testing checkValidEndSuspensionInput()
  it('should give no error message when endSuspensionDate is a valid choice', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1956, 4, 29)
    person.SSbirthDate = new MonthYearDate (1956, 4, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    person.fixedRetirementBenefitDate = new MonthYearDate(2018, 6, 1) //July 2018
    person.beginSuspensionDate = new MonthYearDate(2025, 3, 1)
    person.endSuspensionDate = new MonthYearDate(2026, 3, 1)
    expect(service.checkValidEndSuspensionInput(person))
      .toBeUndefined()
  }))


  it('should reject endSuspensionDate when it is prior to beginSuspensionDate', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1956, 4, 29)
    person.SSbirthDate = new MonthYearDate (1956, 4, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    person.fixedRetirementBenefitDate = new MonthYearDate(2018, 6, 1) //July 2018
    person.beginSuspensionDate = new MonthYearDate(2026, 3, 1)
    person.endSuspensionDate = new MonthYearDate(2025, 3, 1)
    expect(service.checkValidEndSuspensionInput(person))
      .toEqual("Please enter an end-suspension date that is no earlier than the begin-suspension date.")
  }))

  it('should reject endSuspensionDate when it is after age 70', inject([InputValidationService], (service: InputValidationService) => {
    let birthdayService:BirthdayService = new BirthdayService()
    let person:Person = new Person("A")
    person.actualBirthDate = new Date (1956, 4, 29)
    person.SSbirthDate = new MonthYearDate (1956, 4, 1)
    person.FRA = birthdayService.findFRA(person.SSbirthDate)
    person.fixedRetirementBenefitDate = new MonthYearDate(2018, 6, 1) //July 2018
    person.beginSuspensionDate = new MonthYearDate(2026, 3, 1)
    person.endSuspensionDate = new MonthYearDate(2026, 5, 1)
    expect(service.checkValidEndSuspensionInput(person))
      .toEqual("Please enter a date no later than the month in which this person attains age 70.")
  }))


});
