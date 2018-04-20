import { Component, OnInit } from '@angular/core';
import { BenefitService } from '../benefit.service';
import {BirthdayService} from '../birthday.service'
import {PresentvalueService} from '../presentvalue.service'

@Component({
  selector: 'app-input-form',
  templateUrl: './input-form.component.html',
  styleUrls: ['./input-form.component.css']
})
export class InputFormComponent implements OnInit {

  constructor(private benefitService: BenefitService, private birthdayService: BirthdayService, private presentvalueService: PresentvalueService) { }

  ngOnInit() {

  }

//Variables to make form work
  inputMonths: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  inputDays: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
              16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]
  inputYears = [ 1947, 1948, 1949,
              1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1958, 1959,
              1960, 1961, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969,
              1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979,
              1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989,
              1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999,
              2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
              2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018
              ]
  inputBenefitYears = [2014, 2015, 2016, 2017, 2018, 2019,
                    2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029,
                    2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039,
                    2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049,
                    2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058, 2059,
                    2060]


//Inputs from form
  inputMonth: number
  inputDay: number
  inputYear: number
  PIA: number
  inputBenefitMonth: number
  inputBenefitYear: number
  gender: string = "male"
  discountRate: number = 0.007

  onSubmit() {
  console.log("-------------")
  console.log("inputBenefitMonth: " + this.inputBenefitMonth)
  console.log("inputBenefitYear: " + this.inputBenefitYear)
  console.log("gender: " + this.gender)
  console.log("PIA: " + this.PIA)
  console.log("discountRate: " + this.discountRate)
  this.birthdayService.findSSbirthdate(this.inputMonth, this.inputDay, this.inputYear);
  console.log("FRA: " + this.birthdayService.findFRA())
  console.log("Benefit using input dates: " + this.benefitService.calculateRetirementBenefit(Number(this.PIA), this.birthdayService.findFRA(), this.inputBenefitMonth, this.inputBenefitYear))
  console.log("PV using input dates: " + this.presentvalueService.calculateRetirementPV(Number(this.PIA), this.inputBenefitMonth, this.inputBenefitYear, this.gender, this.discountRate))
  this.presentvalueService.maximizeRetirementPV(Number(this.PIA), this.birthdayService.findFRA(), this.gender, Number(this.discountRate))
  }





}
