import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Settings} from '../config/settings.service';
import {LocalizationWithLines} from '../types/localization-with-lines';
import { AppHttpClient } from '../http/app-http-client.service';

@Injectable({
    providedIn: 'root',
})
export class Localizations {
    constructor(private http: AppHttpClient, private settings: Settings) {}

    /**
     * Get all available  localizations.
     */
    public all(): Observable<{localizations: LocalizationWithLines[]}> {
        return this.http.get('localizations');
    }

    /**
     * Get localization by specified name.
     */
    public get(name: string): Observable<{localization: LocalizationWithLines}> {
        return this.http.get('localizations/' + name);
    }

    /**
     * Create new localization.
     */
    public create(params: object): Observable<{localization: LocalizationWithLines}> {
        return this.http.post('localizations', params);
    }

    /**
     * Update specified localization.
     */
    public update(id: number, params: object): Observable<{localization: LocalizationWithLines}> {
        return this.http.put('localizations/' + id, params);
    }

    /**
     * Delete specified localization.
     */
    public delete(id: number) {
        return this.http.delete('localizations/' + id);
    }

    /**
     * Set specified localization as default for new users.
     */
    public setDefault(name: string): Observable<any> {
        const params = {client: {'i18n.default_localization': name}};
        return this.settings.save(params);
    }
}
