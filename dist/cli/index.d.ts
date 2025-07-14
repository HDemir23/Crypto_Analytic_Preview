export interface CLIConfig {
    coin: string;
    forecast: number;
    range: number;
    save?: boolean;
    compare?: boolean;
}
export declare function parseArguments(): CLIConfig;
export declare function validateConfiguration(config: CLIConfig): void;
export declare function displayConfigSummary(config: CLIConfig): void;
export declare function initializeCLI(): CLIConfig;
export declare function getCacheStats(): {
    configCache: number;
    validationCache: number;
};
export declare function clearCaches(): void;
//# sourceMappingURL=index.d.ts.map