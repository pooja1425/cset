////////////////////////////////
//
//   Copyright 2020 Battelle Energy Alliance, LLC
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in all
//  copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//  SOFTWARE.
//
////////////////////////////////
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef } from "@angular/material";
import { Router } from '@angular/router';
import { QuestionFiltersComponent } from "../../dialogs/question-filters/question-filters.component";
import { Domain, QuestionGroup, QuestionResponse, QuestionResponseWithDomains } from '../../models/questions.model';
import { AssessmentService } from '../../services/assessment.service';
import { NavTreeNode } from '../../services/navigation.service';
import { QuestionsService } from '../../services/questions.service';
import { StandardService } from '../../services/standard.service';
import { NavigationService } from '../../services/navigation.service';


@Component({
  selector: 'app-questions',
  templateUrl: './questions.component.html',
  // tslint:disable-next-line:use-host-property-decorator
  host: { class: 'd-flex flex-column flex-11a' }
})
export class QuestionsComponent implements AfterViewInit {
  @ViewChild('questionBlock') questionBlock;

  domains: Domain[] = null;

  setHasRequirements = false;

  setHasQuestions = false;

  autoLoadSupplementalInfo: boolean;

  filterDialogRef: MatDialogRef<QuestionFiltersComponent>;

  currentDomain: string;

  PreviousComponentGroup = null;

  /**
   * 
   */
  constructor(
    public questionsSvc: QuestionsService,
    public assessSvc: AssessmentService,
    private stdSvc: StandardService,
    public navSvc: NavigationService,
    private router: Router,
    private dialog: MatDialog
  ) {
    const magic = this.navSvc.getMagic();
    console.log('questions.component:  set questions tree with loading...');
    this.navSvc.setQuestionsTree([
      { label: 'Please wait', value: '', children: [] },
      { label: 'Loading questions', value: '', children: [] }
    ], magic, true);

    this.autoLoadSupplementalInfo = this.questionsSvc.autoLoadSupplementalSetting;

    // if running in IE, turn off the auto load feature
    if (this.browserIsIE()) {
      this.autoLoadSupplementalInfo = false;
    }
    
    this.getQuestionCounts();
  }

  updateComponentsOverride() {
    //divide the component override processing 
    //and component questions into two portions
    //and call and update from here.    

    //clear out the navigation overrides
    //then call the get overrides questions api
    //and refressh overrides navigation
    const magic = this.navSvc.getMagic();
    this.questionsSvc.getQuestionListOverridesOnly().subscribe((data: QuestionResponse) => {
      this.processComponentOverrides(data.QuestionGroups);
      for (let i = this.domains[0].QuestionGroups.length - 1; i > 0; i--) {
        const q = this.domains[0].QuestionGroups[i];
        if (q.IsOverride) {
          this.domains[0].QuestionGroups.pop();
        }
      }
      for (let newgroup of data.QuestionGroups) {
        this.domains[0].QuestionGroups.push(newgroup);
      }
      this.refreshQuestionVisibility(magic);
    });
  }
  /**
   *
   */
  ngAfterViewInit() {
    if (this.domains != null && this.domains.length <= 0) {
      this.loadQuestions();
    }

    this.assessSvc.currentTab = 'questions';
  }

  /**
   * Re-evaluates the visibility of all questions/subcategories/categories
   * based on the current filter settings.
   * Also re-draws the sidenav category tree, skipping categories
   * that are not currently visible.
   */
  refreshQuestionVisibility(magic?: string) {
    if (!magic) {
      magic = this.navSvc.getMagic();
    }

    this.questionsSvc.evaluateFilters(this.domains);
    if (!!this.domains) {
      this.populateTree(magic);
    }
  }

  /**
   * Changes the application mode of the assessment
   */
  setMode(mode: string) {

    console.log('questions.component setMode loading ...');

    this.navSvc.setQuestionsTree([
      { label: 'Please wait', value: '', children: [] },
      { label: 'Loading questions', value: '', children: [] }
    ], this.navSvc.getMagic(), true);

    this.questionsSvc.setMode(mode).subscribe(() => this.loadQuestions());
  }

  getQuestionCounts(){
    this.questionsSvc.getQuestionsList().subscribe(
      (data: QuestionResponse) => {
        this.assessSvc.applicationMode = data.ApplicationMode;
        this.setHasRequirements = (data.RequirementCount > 0);
        this.setHasQuestions = (data.QuestionCount > 0);

        if(!this.setHasQuestions && !this.setHasRequirements){
          this.assessSvc.applicationMode = 'Q';
          this.questionsSvc.setMode(this.assessSvc.applicationMode).subscribe(() => this.loadQuestions());
        }
        else if(!this.setHasRequirements && this.assessSvc.applicationMode == "R"){
          this.assessSvc.applicationMode = 'Q';
          this.questionsSvc.setMode(this.assessSvc.applicationMode).subscribe(() => this.loadQuestions());
        }
        else if(this.setHasRequirements && this.assessSvc.applicationMode == 'R'){
          this.assessSvc.applicationMode = 'R';
          this.questionsSvc.setMode(this.assessSvc.applicationMode).subscribe(() => this.loadQuestions());
        }
        else if(!this.setHasQuestions && this.assessSvc.applicationMode == 'Q'){
          this.assessSvc.applicationMode = 'R';
          this.questionsSvc.setMode(this.assessSvc.applicationMode).subscribe(() => this.loadQuestions());
        }
        else {
          this.assessSvc.applicationMode = 'Q';
          this.questionsSvc.setMode(this.assessSvc.applicationMode).subscribe(() => this.loadQuestions());
        }
      });
  }


  /**
   * Retrieves the complete list of questions
   */
  loadQuestions() {
    const magic = this.navSvc.getMagic();
    this.domains = null;
    this.questionsSvc.getQuestionsList().subscribe(
      (data: QuestionResponse) => {
        this.assessSvc.applicationMode = data.ApplicationMode;
        this.setHasRequirements = (data.RequirementCount > 0);
        this.setHasQuestions = (data.QuestionCount > 0);
        this.questionsSvc.questions = data;

        // Reformat the response to create domain groupings ---------------------------------
        const bigStructure: QuestionResponseWithDomains = {
          ApplicationMode: data.ApplicationMode,
          Domains: [],
          OverallIRP: data.OverallIRP,
          QuestionCount: data.QuestionCount,
          RequirementCount: data.RequirementCount
        };

       
        
        data.QuestionGroups.forEach(g => {
          if (!bigStructure.Domains.find(d => d.DomainName === g.DomainName)) {
            bigStructure.Domains.push({
              DomainName: g.DomainName,
              QuestionGroups: []
            });
          }
          bigStructure.Domains.find(d => d.DomainName === g.DomainName).QuestionGroups.push(g);
        });
        this.domains = bigStructure.Domains;
        this.questionsSvc.domains = bigStructure.Domains;
        this.processComponentOverrides(data.QuestionGroups);

        // default the selected maturity filters
        this.questionsSvc.initializeMatFilters(data.OverallIRP);

        this.refreshQuestionVisibility(magic);
      },
      error => {
        console.log(
          'Error getting questions: ' +
          (<Error>error).name +
          (<Error>error).message
        );
        console.log('Error getting questions: ' + (<Error>error).stack);
      }
    );
  }

  processComponentOverrides(QuestionGroups: QuestionGroup[]) {
    QuestionGroups.forEach(g => {
      let rval = true;
      if (g.Symbol_Name) {
        if (this.PreviousComponentGroup) {
          rval = !((g.Symbol_Name === this.PreviousComponentGroup.ComponentType)
            && (g.ComponentName === this.PreviousComponentGroup.ComponentName));
        }
        this.PreviousComponentGroup = g;
      } else {
        rval = false;
      }
      g.ShowOverrideHeader = rval;
    });
  }


  /**
   * Builds the side nav tree structure.
   * @param magic
   */
  populateTree(magic?: string) {
    if (!magic) {
      magic = this.navSvc.getMagic();
    }
    const tree: NavTreeNode[] = [];
    this.domains.forEach(d => {
      d.QuestionGroups
        .filter(g => g.Visible)
        .map(q => {

          if (!!q.StandardShortName) {
            this.insertWithParents(tree, q);
          } else {
            tree.push({
              label: q.GroupHeadingText,
              elementType: 'QUESTION-HEADING',
              value: {
                target: q.NavigationGUID,
                question: q.GroupHeadingId
              },
              children: []
            });
          }
        });
    });

    console.log('questions.component populateTree setQuestionsTree ....');
    this.navSvc.setQuestionsTree(tree, magic, true);
    this.navSvc.itemSelected
      .asObservable()
      .subscribe(
        (tgt: { target: string; parent?: string, question: number; subcategory?: number }) => {
          if (!!tgt.subcategory) {
            this.domains.forEach(d => {
              d.QuestionGroups
                .find(val => val.GroupHeadingId === tgt.question)
                .SubCategories.find(
                  val => val.SubCategoryId === tgt.subcategory
                ).Expanded = true;
            });

            const t = document.getElementById(tgt.parent);
            if (!!t) {
              t.scrollIntoView();
            }
          }

          if (!!tgt.target) {
            const t = document.getElementById(tgt.target);
            if (!!t) {
              t.scrollIntoView();
            }
          }
        }
      );
  }

  /**
   * Insert the Heading into the tree with optional Standard / Domain parents.
   * @param tree
   * @param q
   */
  insertWithParents(tree: NavTreeNode[], q: QuestionGroup) {

    if (!!q.Symbol_Name) {
      this.insertComponentSpecificOverride(tree, q);
      return;
    }

    let standard = tree.find(elem => elem.elementType === 'STANDARD' && elem.label === q.StandardShortName);
    if (!standard) {
      tree.push({
        label: q.StandardShortName,
        elementType: 'STANDARD',
        value: '',
        children: []
      });
      standard = tree[tree.length - 1];
    }

    // this element is only built if the question group belongs to a domain (ACET)
    let domain = null;
    if (!!q.DomainName) {
      domain = standard.children.find(elem => elem.elementType === 'DOMAIN' && elem.label === q.DomainName);
      if (!domain) {
        standard.children.push({
          label: q.DomainName,
          elementType: 'DOMAIN',
          value: '',
          children: []
        });
        domain = standard.children[standard.children.length - 1];
      }
    }

    // build the question group heading element
    const heading = {
      label: q.GroupHeadingText,
      value: {
        target: q.NavigationGUID,
        question: q.GroupHeadingId
      },
      elementType: 'QUESTION-HEADING',
      children: []
    };


    if (!!domain) {
      domain.children.push(heading);
    } else {
      standard.children.push(heading);
    }
  }

  insertComponentSpecificOverride(tree: NavTreeNode[], q: QuestionGroup) {
    let standard = tree.find(elem => elem.elementType === 'STANDARD' && elem.label === q.StandardShortName);
    if (!standard) {
      tree.push({
        label: q.StandardShortName,
        elementType: 'STANDARD',
        value: '',
        children: []
      });
      standard = tree[tree.length - 1];
    }

    let componenttype = standard.children.find(elem => elem.elementType === 'COMPONENT-TYPE' && elem.label === q.Symbol_Name);
    if (!componenttype) {
      standard.children.push({
        label: q.Symbol_Name,
        elementType: 'COMPONENT-TYPE',
        value: '',
        children: []
      });
      componenttype = standard.children[standard.children.length - 1];
    }

    let componentname = componenttype.children.find(elem => elem.elementType === 'COMPONENT-NAME' && elem.label === q.ComponentName);
    if (!componentname) {
      componenttype.children.push({
        label: q.ComponentName,
        elementType: 'COMPONENT-NAME',
        value: '',
        children: []
      });
      componentname = componenttype.children[componenttype.children.length - 1];
    }
    // get the header
    // get the componenttype
    // get the componentname

    // build the question group heading element
    q.SubCategories.forEach(sub => {
      const heading = {
        label: sub.SubCategoryHeadingText,
        value: {
          target: sub.NavigationGUID,
          question: q.GroupHeadingId
        },
        elementType: 'QUESTION-HEADING',
        children: []
      };
      componentname.children.push(heading);
    });
  }

  visibleGroupCount() {
    if (!this.domains) {
      return 1;
    }
    let count = 0;
    this.domains.forEach(d => {
      count = count + d.QuestionGroups.filter(g => g.Visible).length;
    });
    return count;
  }

  hasDomainChanged(domain) {
    if (!domain) {
      return false;
    }
    if (this.currentDomain !== domain) {
      this.currentDomain = domain;
      return false;
    }
    return true;
  }

  addDomainPad(domain) {
    if (domain != null) {
      return "domain-pad";
    }
    return "";
  }
  /**
   * Returns a boolean indicating if the browser is IE or Edge.
   * The 'auto-load supplemental' logic is not performant in IE, so we won't offer it.
   */
  browserIsIE() {
    const isIEOrEdge = /msie\s|trident\/|edge\//i.test(window.navigator.userAgent);
    return isIEOrEdge;
  }


  /**
   * Stores the Supplemental auto-load setting in the service
   * for access by the child components.
   */
  persistAutoLoadSetting() {
    this.questionsSvc.autoLoadSupplementalSetting = this.autoLoadSupplementalInfo;
  }


  /**
   * Controls the mass expansion/collapse of all subcategories on the screen.
   * @param mode
   */
  expandAll(mode: boolean) {
    this.domains.forEach((d: Domain) => {
      d.QuestionGroups.forEach(group => {
        group.SubCategories.forEach(subcategory => {
          subcategory.Expanded = mode;
        });
      });
    });
  }


  showFilterDialog() {
    this.filterDialogRef = this.dialog.open(QuestionFiltersComponent);
    this.filterDialogRef.componentInstance.filterChanged.asObservable().subscribe(() => {
      this.refreshQuestionVisibility();
    });
    this.filterDialogRef
      .afterClosed()
      .subscribe(() => {
        this.refreshQuestionVisibility();
      });
  }

  /**
   * Builds category IDs in a consistent way.
   */
  formatID(s) {
    return s.toLowerCase().replace(/ /g, '-');
  }
}
