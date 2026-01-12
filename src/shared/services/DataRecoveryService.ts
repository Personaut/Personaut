/**
 * Data Recovery Tool for Personaut Extension
 * 
 * This tool checks for lost data and attempts recovery after the
 * data loss bug in versions 0.1.3-0.1.4.
 * 
 * Usage:
 * 1. Open VS Code Developer Tools (Help > Toggle Developer Tools)
 * 2. Run this in the console
 * 3. Check the output for recoverable data
 */

import * as vscode from 'vscode';
import { ConversationFileStorage } from '../../features/chat/services/ConversationFileStorage';
import { PersonaFileStorage } from '../../features/personas/services/PersonaFileStorage';
import { FileStorageService } from './FileStorageService';

export interface RecoveryReport {
    globalStateConversations: number;
    globalStatePersonas: number;
    fileStorageConversations: number;
    fileStoragePersonas: number;
    canRecover: boolean;
    recommendations: string[];
}

/**
 * Check for data in both globalState and file storage
 */
export async function checkDataRecovery(context: vscode.ExtensionContext): Promise<RecoveryReport> {
    const report: RecoveryReport = {
        globalStateConversations: 0,
        globalStatePersonas: 0,
        fileStorageConversations: 0,
        fileStoragePersonas: 0,
        canRecover: false,
        recommendations: [],
    };

    console.log('[Recovery] Starting data recovery check...');

    // Check globalState for conversations
    try {
        const conversations1 = context.globalState.get<any[]>('conversations', []);
        const conversations2 = context.globalState.get<any[]>('conversationHistory', []);
        const conversations3 = context.globalState.get<any[]>('personaut.conversations', []);

        report.globalStateConversations = Math.max(
            conversations1.length,
            conversations2.length,
            conversations3.length
        );

        console.log(`[Recovery] Found ${report.globalStateConversations} conversations in globalState`);

        if (report.globalStateConversations > 0) {
            report.recommendations.push(
                `✅ Found ${report.globalStateConversations} conversations in globalState - can be recovered!`
            );
        }
    } catch (err) {
        console.error('[Recovery] Error checking globalState conversations:', err);
    }

    // Check globalState for personas
    try {
        const personas1 = context.globalState.get<any[]>('personaut.customerProfiles', []);
        const personas2 = context.globalState.get<any[]>('personaut.personas', []);
        const personas3 = context.globalState.get<any[]>('personaut.favoritePersonas', []);

        report.globalStatePersonas = Math.max(
            personas1.length,
            personas2.length,
            personas3.length
        );

        console.log(`[Recovery] Found ${report.globalStatePersonas} personas in globalState`);

        if (report.globalStatePersonas > 0) {
            report.recommendations.push(
                `✅ Found ${report.globalStatePersonas} personas in globalState - can be recovered!`
            );
        }
    } catch (err) {
        console.error('[Recovery] Error checking globalState personas:', err);
    }

    // Check file storage for conversations
    try {
        const fileStorage = new FileStorageService(context.globalStorageUri.fsPath);
        const conversationFileStorage = new ConversationFileStorage(fileStorage);
        await conversationFileStorage.initialize();

        const fileConversations = await conversationFileStorage.getAllConversations();
        report.fileStorageConversations = fileConversations.length;

        console.log(`[Recovery] Found ${report.fileStorageConversations} conversations in file storage`);

        if (report.fileStorageConversations > 0) {
            report.recommendations.push(
                `✅ Found ${report.fileStorageConversations} conversations in file storage - already migrated!`
            );
        }
    } catch (err) {
        console.error('[Recovery] Error checking file storage conversations:', err);
    }

    // Check file storage for personas
    try {
        const fileStorage = new FileStorageService(context.globalStorageUri.fsPath);
        const personaFileStorage = new PersonaFileStorage(fileStorage);
        await personaFileStorage.initialize();

        const filePersonas = await personaFileStorage.getAllPersonas();
        report.fileStoragePersonas = filePersonas.length;

        console.log(`[Recovery] Found ${report.fileStoragePersonas} personas in file storage`);

        if (report.fileStoragePersonas > 0) {
            report.recommendations.push(
                `✅ Found ${report.fileStoragePersonas} personas in file storage - already migrated!`
            );
        }
    } catch (err) {
        console.error('[Recovery] Error checking file storage personas:', err);
    }

    // Determine if recovery is possible
    report.canRecover =
        report.globalStateConversations > 0 ||
        report.globalStatePersonas > 0 ||
        report.fileStorageConversations > 0 ||
        report.fileStoragePersonas > 0;

    // Add recommendations
    if (!report.canRecover) {
        report.recommendations.push(
            '❌ No data found in globalState or file storage',
            '⚠️ Data may have been permanently deleted',
            '💡 Check VS Code backups in ~/Library/Application Support/Code/User/globalStorage/'
        );
    } else {
        if (report.globalStateConversations > 0 || report.globalStatePersonas > 0) {
            report.recommendations.push(
                '🔧 Run recovery command: personaut.recoverData',
                '📝 This will migrate data from globalState to file storage'
            );
        }

        if (report.fileStorageConversations > 0 || report.fileStoragePersonas > 0) {
            report.recommendations.push(
                '✅ Data already in file storage - should be visible in extension',
                '🔄 Try reloading VS Code window if not visible'
            );
        }
    }

    return report;
}

/**
 * Recover data from globalState to file storage
 */
export async function recoverData(context: vscode.ExtensionContext): Promise<void> {
    console.log('[Recovery] Starting data recovery...');

    const fileStorage = new FileStorageService(context.globalStorageUri.fsPath);

    // Recover conversations
    try {
        const conversationFileStorage = new ConversationFileStorage(fileStorage);
        await conversationFileStorage.initialize();

        // Get all possible conversation keys
        const conversations1 = context.globalState.get<any[]>('conversations', []);
        const conversations2 = context.globalState.get<any[]>('conversationHistory', []);
        const conversations3 = context.globalState.get<any[]>('personaut.conversations', []);

        // Merge and deduplicate
        const allConversations = [...conversations1, ...conversations2, ...conversations3];
        const uniqueConversations = new Map();
        for (const conv of allConversations) {
            if (conv.id && !uniqueConversations.has(conv.id)) {
                uniqueConversations.set(conv.id, conv);
            }
        }

        const conversations = Array.from(uniqueConversations.values());

        console.log(`[Recovery] Recovering ${conversations.length} conversations...`);

        for (const conv of conversations) {
            await conversationFileStorage.saveConversation(conv);
        }

        console.log(`[Recovery] ✅ Recovered ${conversations.length} conversations`);
        vscode.window.showInformationMessage(`Recovered ${conversations.length} conversations!`);
    } catch (err) {
        console.error('[Recovery] Failed to recover conversations:', err);
        vscode.window.showErrorMessage(`Failed to recover conversations: ${err}`);
    }

    // Recover personas
    try {
        const personaFileStorage = new PersonaFileStorage(fileStorage);
        await personaFileStorage.initialize();

        // Get all possible persona keys
        const personas1 = context.globalState.get<any[]>('personaut.customerProfiles', []);
        const personas2 = context.globalState.get<any[]>('personaut.personas', []);

        // Merge and deduplicate
        const allPersonas = [...personas1, ...personas2];
        const uniquePersonas = new Map();
        for (const persona of allPersonas) {
            if (persona.id && !uniquePersonas.has(persona.id)) {
                uniquePersonas.set(persona.id, persona);
            }
        }

        const personas = Array.from(uniquePersonas.values());

        console.log(`[Recovery] Recovering ${personas.length} personas...`);

        for (const persona of personas) {
            // Convert old format to new format if needed
            const personaData = {
                id: persona.id,
                name: persona.name,
                backstory: persona.backstory || '',
                attributes: persona.attributes || {},
                versionNumber: persona.versionNumber || 1,
                createdAt: persona.createdAt || Date.now(),
                updatedAt: persona.updatedAt || Date.now(),
            };

            await personaFileStorage.savePersona(personaData);
        }

        console.log(`[Recovery] ✅ Recovered ${personas.length} personas`);
        vscode.window.showInformationMessage(`Recovered ${personas.length} personas!`);
    } catch (err) {
        console.error('[Recovery] Failed to recover personas:', err);
        vscode.window.showErrorMessage(`Failed to recover personas: ${err}`);
    }

    console.log('[Recovery] Data recovery complete!');
}

/**
 * Register recovery commands
 */
export function registerRecoveryCommands(context: vscode.ExtensionContext): void {
    // Command to check for recoverable data
    context.subscriptions.push(
        vscode.commands.registerCommand('personaut.checkRecovery', async () => {
            const report = await checkDataRecovery(context);

            const message = [
                '📊 Data Recovery Report:',
                ``,
                `GlobalState:`,
                `  Conversations: ${report.globalStateConversations}`,
                `  Personas: ${report.globalStatePersonas}`,
                ``,
                `File Storage:`,
                `  Conversations: ${report.fileStorageConversations}`,
                `  Personas: ${report.fileStoragePersonas}`,
                ``,
                `Recommendations:`,
                ...report.recommendations.map(r => `  ${r}`),
            ].join('\n');

            console.log(message);
            vscode.window.showInformationMessage(
                `Recovery Check Complete. See console for details.`,
                'View Console'
            ).then(selection => {
                if (selection === 'View Console') {
                    vscode.commands.executeCommand('workbench.action.toggleDevTools');
                }
            });
        })
    );

    // Command to recover data
    context.subscriptions.push(
        vscode.commands.registerCommand('personaut.recoverData', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'This will attempt to recover data from globalState to file storage. Continue?',
                'Yes', 'No'
            );

            if (confirm === 'Yes') {
                await recoverData(context);
            }
        })
    );
}
