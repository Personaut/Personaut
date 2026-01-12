import {
    parseStageData,
    serializeStageData,
    createStageFileData,
    validateStageFileData,
    deriveCurrentStage,
    arePrerequisitesComplete,
    getNextStage,
    getPreviousStage,
    calculateProgress,
    getStageIndex,
    formatStageTimestamp,
    STAGE_FILE_NAMES,
} from '../utils/stageFiles';
import { DESIGN_STAGES, DesignStage } from '../types';

describe('stageFiles utils', () => {
    describe('STAGE_FILE_NAMES', () => {
        it('has a file name for each stage', () => {
            DESIGN_STAGES.forEach((stage) => {
                expect(STAGE_FILE_NAMES[stage]).toBeDefined();
                expect(STAGE_FILE_NAMES[stage]).toMatch(/\.json$/);
            });
        });
    });

    describe('parseStageData', () => {
        it('returns parsed data for valid JSON', () => {
            const result = parseStageData('{"name":"test"}', {});
            expect(result).toEqual({ name: 'test' });
        });

        it('returns default value for null', () => {
            const defaultVal = { fallback: true };
            const result = parseStageData(null, defaultVal);
            expect(result).toEqual(defaultVal);
        });

        it('returns default value for undefined', () => {
            const defaultVal = { fallback: true };
            const result = parseStageData(undefined, defaultVal);
            expect(result).toEqual(defaultVal);
        });

        it('returns default value for invalid JSON', () => {
            const defaultVal = { fallback: true };
            const result = parseStageData('not valid json', defaultVal);
            expect(result).toEqual(defaultVal);
        });
    });

    describe('serializeStageData', () => {
        it('serializes data to JSON string', () => {
            const result = serializeStageData({ name: 'test' });
            expect(result).toBe('{\n  "name": "test"\n}');
        });

        it('returns empty object for circular references', () => {
            const circular: Record<string, unknown> = {};
            circular.self = circular;
            const result = serializeStageData(circular);
            expect(result).toBe('{}');
        });
    });

    describe('createStageFileData', () => {
        it('creates wrapper with stage and timestamp', () => {
            const result = createStageFileData('idea', { test: true });
            expect(result.stage).toBe('idea');
            expect(result.data).toEqual({ test: true });
            expect(result.timestamp).toBeDefined();
            expect(typeof result.timestamp).toBe('number');
        });
    });

    describe('validateStageFileData', () => {
        it('returns true for valid data', () => {
            const data = {
                stage: 'idea',
                timestamp: Date.now(),
                data: { test: true },
            };
            expect(validateStageFileData(data)).toBe(true);
        });

        it('returns false for missing stage', () => {
            const data = {
                timestamp: Date.now(),
                data: { test: true },
            };
            expect(validateStageFileData(data)).toBe(false);
        });

        it('returns false for invalid stage', () => {
            const data = {
                stage: 'invalid',
                timestamp: Date.now(),
                data: { test: true },
            };
            expect(validateStageFileData(data)).toBe(false);
        });

        it('returns false for missing timestamp', () => {
            const data = {
                stage: 'idea',
                data: { test: true },
            };
            expect(validateStageFileData(data)).toBe(false);
        });

        it('returns false for null', () => {
            expect(validateStageFileData(null)).toBe(false);
        });
    });

    describe('deriveCurrentStage', () => {
        it('returns first stage when none complete', () => {
            const result = deriveCurrentStage([], {} as Record<DesignStage, unknown>);
            expect(result).toBe('idea');
        });

        it('returns next incomplete stage', () => {
            const result = deriveCurrentStage(['idea', 'users'], {} as Record<DesignStage, unknown>);
            expect(result).toBe('features');
        });

        it('returns finalize when all stages complete', () => {
            const result = deriveCurrentStage(
                ['idea', 'users', 'features', 'stories', 'design', 'finalize'],
                {} as Record<DesignStage, unknown>
            );
            expect(result).toBe('finalize');
        });
    });

    describe('arePrerequisitesComplete', () => {
        it('returns true for idea stage (no prerequisites)', () => {
            expect(arePrerequisitesComplete('idea', [])).toBe(true);
        });

        it('returns true when all prerequisites are complete', () => {
            expect(arePrerequisitesComplete('features', ['idea', 'users'])).toBe(true);
        });

        it('returns false when prerequisites are missing', () => {
            expect(arePrerequisitesComplete('features', ['idea'])).toBe(false);
        });
    });

    describe('getNextStage', () => {
        it('returns next stage', () => {
            expect(getNextStage('idea')).toBe('users');
            expect(getNextStage('users')).toBe('features');
        });

        it('returns null for last stage', () => {
            expect(getNextStage('finalize')).toBe(null);
        });
    });

    describe('getPreviousStage', () => {
        it('returns previous stage', () => {
            expect(getPreviousStage('users')).toBe('idea');
            expect(getPreviousStage('features')).toBe('users');
        });

        it('returns null for first stage', () => {
            expect(getPreviousStage('idea')).toBe(null);
        });
    });

    describe('calculateProgress', () => {
        it('returns 0 for no completed stages', () => {
            expect(calculateProgress([])).toBe(0);
        });

        it('returns correct percentage', () => {
            expect(calculateProgress(['idea'])).toBe(17); // 1/6 * 100 rounded
            expect(calculateProgress(['idea', 'users', 'features'])).toBe(50); // 3/6 * 100 rounded
        });

        it('returns 100 for all stages complete', () => {
            expect(
                calculateProgress(['idea', 'users', 'features', 'stories', 'design', 'finalize'])
            ).toBe(100);
        });
    });

    describe('getStageIndex', () => {
        it('returns correct index for each stage', () => {
            expect(getStageIndex('idea')).toBe(0);
            expect(getStageIndex('users')).toBe(1);
            expect(getStageIndex('finalize')).toBe(5);
        });
    });

    describe('formatStageTimestamp', () => {
        it('formats timestamp correctly', () => {
            const timestamp = new Date('2024-03-15T10:30:00').getTime();
            const result = formatStageTimestamp(timestamp);
            expect(result).toMatch(/Mar 15/);
            expect(result).toMatch(/10:30/);
        });
    });
});
