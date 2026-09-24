import {_buildSortKey, _sortCategorizedReports} from '@libs/SidebarUtils';
import {localeCompare} from '../utils/TestHelper';

type MiniReport = {
    reportID?: string;
    displayName: string;
    sortKey: string;
    lastVisibleActionCreated?: string;
};

const toMiniReport = (displayName: string, reportID: string): MiniReport => ({
    reportID,
    displayName,
    sortKey: _buildSortKey(displayName),
});

const emptyCategories = {
    pinnedAndGBRReports: [] as MiniReport[],
    errorReports: [] as MiniReport[],
    draftReports: [] as MiniReport[],
    nonArchivedReports: [] as MiniReport[],
    archivedReports: [] as MiniReport[],
};

describe('LHN sorting with locale-specific letters', () => {
    it('orders pinned chats whose names contain accented letters by locale, not by code unit', () => {
        // Given three pinned chats named as in the bug report, where one name starts with "Ñ" (U+00F1).
        // "Ñ" has a higher code unit than "z" (U+007A), so a raw < / > comparison misplaces it after "Zote".
        const reports = [toMiniReport('Nuevo Budget', '1'), toMiniReport('Ñu Safari', '2'), toMiniReport('Zote Report', '3')];

        // When the pinned category is sorted
        const sorted = _sortCategorizedReports({...emptyCategories, pinnedAndGBRReports: reports}, true, localeCompare);

        // Then the order must follow locale collation, where "Ñ" sorts next to "N" and before "Z"
        expect(sorted.pinnedAndGBRReports.map((report) => report.displayName)).toEqual(['Nuevo Budget', 'Ñu Safari', 'Zote Report']);
    });

    it('does not reach the locale-aware fallback for distinct names', () => {
        // Given two distinct names, one accented
        const accentedKey = _buildSortKey('Ñu Safari');
        const plainKey = _buildSortKey('Zote Report');

        // Then their sort keys differ, so the comparator resolves on < / > and never calls localeCompare.
        // This is why the Collator fallback in sortCategorizedReports is effectively unreachable.
        expect(accentedKey).not.toEqual(plainKey);
        expect(accentedKey > plainKey).toBe(true);
    });
});
