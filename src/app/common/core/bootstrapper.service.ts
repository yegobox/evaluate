import { Injectable, Injector } from "@angular/core";
import { Settings } from "./config/settings.service";
import { Translations } from "./translations/translations.service";
import { APP_CONFIG, FlipperConfig } from "./config/flipper-config";
import { Role } from "./types/models/Role";
import { User, UserData } from "./types/models/User";
import { LocalizationWithLines } from "./types/localization-with-lines";
import { CurrentUser } from "../auth/current-user";
import { HttpClient } from "@angular/common/http";
import { AppConfig } from "../../../environments/environment";
import { URL } from "./utils/URL";
import { Router } from '@angular/router';
export function init_app(bootstrapper: Bootstrapper) {
  return () => bootstrapper.bootstrap();
}

export interface BootstrapData {
  csrf_token: string;
  settings: FlipperConfig;
  guests_role: Role | null;
  user_data: UserData | null;
  i18n?: LocalizationWithLines;
}

@Injectable()
export class Bootstrapper {
  protected http: HttpClient;
  protected settings: Settings;
  protected currentUser: CurrentUser;
  protected i18n: Translations;
  public data: BootstrapData;
  
  constructor(protected injector: Injector, protected URL: URL) {
    this.http = this.injector.get(HttpClient);
    this.settings = this.injector.get(Settings);
    this.currentUser = this.injector.get(CurrentUser);
    this.i18n = this.injector.get(Translations);
   // this.router = this.injector.get(Router);
    // merge all config provided by modules into single object
    this.injector.get(APP_CONFIG).forEach(providedConfig => {
      return this.settings.merge({ vebto: providedConfig });
    });
  }

  /**
   * Bootstrap application with data returned from server.
   */
  public bootstrap(data?: string): Promise<any> {
    let url;
    if (!data) data = window["bootstrapData"];
    // if we have bootstrap data in global scope, pass
    // it to the app and return self resolving promise
    if (data) {
      this.handleData(data);
      return new Promise(resolve => resolve());
    }
    // this.URL.defineAppUrl();
  
    // if (this.settings.getBaseUrl() != "http://localhost:4200/") {
    //   url = AppConfig.url + "secure/bootstrap-data";
    // } else {
    
  //  }

    // resolves once request is complete and data is passed to the app
    return new Promise((resolve, reject) => {
      url = "secure/bootstrap-data";
      this.http.get(url).subscribe(
            response => {
              this.handleData(response["data"]);
              resolve();
            },
            error => {
            // console.log("bootstrap error", error);
              reject();
            }
      );
    });
  }

  /**
   * Handle specified bootstrap data.
   */
  protected handleData(encodedData: string): BootstrapData {
    // decode bootstrap data from server
    const data = JSON.parse(atob(encodedData)) as BootstrapData;

    // set csrf token
    this.settings.csrfToken = data.csrf_token;

    // set all settings returned from server
    this.settings.setMultiple(data.settings);
    // set translations
    if (data.i18n) {
      this.i18n.setLocalization(data.i18n);
    }

    // set current user and default role for guests
    localStorage.setItem('active_branch','0');
    this.currentUser.init({
      user_data: data.user_data,
      guestsRole: data.guests_role,
    });

    // init appearance editor mode if needed
    //    this.injector.get(AppearanceListenerService).init();

    this.data = data;

    return data;
  }

  
}
