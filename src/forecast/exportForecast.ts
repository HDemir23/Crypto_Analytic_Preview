import fs from "fs";
import path from "path";
import { debug } from "../index";
import { IndicatorResult, ForecastPoint } from "../indicators";

// Export configuration options
export interface ExportConfig {
  format: "json" | "csv" | "both";
  filename?: string;
  includeIndividualIndicators?: boolean;
  includeMetadata?: boolean;
}

// Export metadata interface
export interface ExportMetadata {
  symbol: string;
  forecastDays: number;
  historicalDays: number;
  generatedAt: string;
  indicatorsUsed: string[];
  totalWeight: number;
  avgConfidence: number;
  priceRange: {
    current: number;
    target: number;
    change: number;
    changePercent: number;
  };
}

// Complete export data structure
export interface ForecastExportData {
  metadata: ExportMetadata;
  combinedForecast: ForecastPoint[];
  individualIndicators?: IndicatorResult[];
  performanceStats?: {
    cacheStats: any;
    executionTime: number;
    dataSource: string;
  };
}

/**
 * Export forecast data to file(s)
 * @param data - Complete forecast data to export
 * @param config - Export configuration options
 * @returns Array of created file paths
 */
export async function exportForecast(
  data: ForecastExportData,
  config: ExportConfig = {
    format: "json",
    includeIndividualIndicators: true,
    includeMetadata: true,
  }
): Promise<string[]> {
  const startTime = Date.now();
  const createdFiles: string[] = [];

  try {
    // Generate base filename if not provided
    const baseFilename = config.filename || generateFilename(data.metadata);

    // Ensure exports directory exists
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
      debug.log(`Created exports directory: ${exportDir}`);
    }

    // Export JSON format
    if (config.format === "json" || config.format === "both") {
      const jsonFile = path.join(exportDir, `${baseFilename}.json`);
      const jsonData = prepareJsonData(data, config);

      fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2), "utf8");
      createdFiles.push(jsonFile);
      debug.success(`JSON export saved: ${jsonFile}`);
    }

    // Export CSV format
    if (config.format === "csv" || config.format === "both") {
      const csvFile = path.join(exportDir, `${baseFilename}.csv`);
      const csvData = prepareCsvData(data, config);

      fs.writeFileSync(csvFile, csvData, "utf8");
      createdFiles.push(csvFile);
      debug.success(`CSV export saved: ${csvFile}`);

      // Export individual indicators CSV if requested
      if (config.includeIndividualIndicators && data.individualIndicators) {
        const indicatorsFile = path.join(
          exportDir,
          `${baseFilename}_indicators.csv`
        );
        const indicatorsCsv = prepareIndicatorsCsv(data.individualIndicators);

        fs.writeFileSync(indicatorsFile, indicatorsCsv, "utf8");
        createdFiles.push(indicatorsFile);
        debug.success(`Indicators CSV saved: ${indicatorsFile}`);
      }
    }

    const exportTime = Date.now() - startTime;
    debug.success(
      `Export completed in ${exportTime}ms - ${createdFiles.length} files created`
    );

    return createdFiles;
  } catch (error) {
    debug.error("Failed to export forecast:", error);
    throw new Error(
      `Export failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate filename based on metadata
 * @param metadata - Export metadata
 * @returns Generated filename (without extension)
 */
function generateFilename(metadata: ExportMetadata): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const time = new Date()
    .toISOString()
    .split("T")[1]
    .split(":")
    .slice(0, 2)
    .join(""); // HHMM
  return `${metadata.symbol}_forecast_${metadata.forecastDays}d_${date}_${time}`;
}

/**
 * Prepare data for JSON export
 * @param data - Complete forecast data
 * @param config - Export configuration
 * @returns JSON-ready data object
 */
function prepareJsonData(data: ForecastExportData, config: ExportConfig): any {
  const exportData: any = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
  };

  if (config.includeMetadata) {
    exportData.metadata = data.metadata;
  }

  exportData.combinedForecast = data.combinedForecast;

  if (config.includeIndividualIndicators && data.individualIndicators) {
    exportData.individualIndicators = data.individualIndicators.map(
      (indicator) => ({
        name: indicator.name,
        accuracy: indicator.accuracy,
        weight: indicator.weight,
        executionTime: indicator.executionTime,
        forecast: indicator.forecast,
      })
    );
  }

  if (data.performanceStats) {
    exportData.performanceStats = data.performanceStats;
  }

  return exportData;
}

/**
 * Prepare data for CSV export (combined forecast)
 * @param data - Complete forecast data
 * @param config - Export configuration
 * @returns CSV string
 */
function prepareCsvData(
  data: ForecastExportData,
  config: ExportConfig
): string {
  const rows: string[] = [];

  // Add metadata header if requested
  if (config.includeMetadata) {
    rows.push(`# Crypto Forecast Export - ${data.metadata.symbol}`);
    rows.push(`# Generated: ${data.metadata.generatedAt}`);
    rows.push(`# Forecast Days: ${data.metadata.forecastDays}`);
    rows.push(`# Historical Days: ${data.metadata.historicalDays}`);
    rows.push(`# Indicators Used: ${data.metadata.indicatorsUsed.join(", ")}`);
    rows.push(
      `# Average Confidence: ${(data.metadata.avgConfidence * 100).toFixed(1)}%`
    );
    rows.push(
      `# Expected Change: ${data.metadata.priceRange.changePercent.toFixed(2)}%`
    );
    rows.push("");
  }

  // CSV header
  rows.push("Day,High,Low,Average,Confidence,Indicator");

  // CSV data rows
  data.combinedForecast.forEach((point) => {
    rows.push(
      [
        point.day,
        point.high.toFixed(2),
        point.low.toFixed(2),
        point.avg.toFixed(2),
        (point.confidence * 100).toFixed(1) + "%",
        point.indicator,
      ].join(",")
    );
  });

  return rows.join("\n");
}

/**
 * Prepare individual indicators data for CSV export
 * @param indicators - Array of indicator results
 * @returns CSV string
 */
function prepareIndicatorsCsv(indicators: IndicatorResult[]): string {
  const rows: string[] = [];

  // CSV header
  rows.push(
    "Indicator,Day,High,Low,Average,Confidence,Accuracy,Weight,ExecutionTime"
  );

  // CSV data rows
  indicators.forEach((indicator) => {
    indicator.forecast.forEach((point) => {
      rows.push(
        [
          indicator.name,
          point.day,
          point.high.toFixed(2),
          point.low.toFixed(2),
          point.avg.toFixed(2),
          (point.confidence * 100).toFixed(1) + "%",
          (indicator.accuracy * 100).toFixed(1) + "%",
          indicator.weight.toFixed(3),
          indicator.executionTime + "ms",
        ].join(",")
      );
    });
  });

  return rows.join("\n");
}

/**
 * Create export metadata from indicators and forecast data
 * @param symbol - Cryptocurrency symbol
 * @param forecastDays - Number of forecast days
 * @param historicalDays - Number of historical days used
 * @param indicators - Array of indicator results
 * @param combinedForecast - Combined forecast data
 * @param currentPrice - Current price for comparison
 * @returns Export metadata object
 */
export function createExportMetadata(
  symbol: string,
  forecastDays: number,
  historicalDays: number,
  indicators: IndicatorResult[],
  combinedForecast: ForecastPoint[],
  currentPrice: number
): ExportMetadata {
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
  const avgConfidence =
    combinedForecast.reduce((sum, point) => sum + point.confidence, 0) /
    combinedForecast.length;
  const targetPrice =
    combinedForecast[combinedForecast.length - 1]?.avg || currentPrice;
  const change = targetPrice - currentPrice;
  const changePercent = (change / currentPrice) * 100;

  return {
    symbol,
    forecastDays,
    historicalDays,
    generatedAt: new Date().toISOString(),
    indicatorsUsed: indicators.map((ind) => ind.name),
    totalWeight,
    avgConfidence,
    priceRange: {
      current: currentPrice,
      target: targetPrice,
      change,
      changePercent,
    },
  };
}

/**
 * Get export statistics
 * @returns Export statistics object
 */
export function getExportStats() {
  const exportDir = path.join(process.cwd(), "exports");

  if (!fs.existsSync(exportDir)) {
    return {
      exportDir: "Not created",
      totalFiles: 0,
      lastExport: "Never",
    };
  }

  const files = fs.readdirSync(exportDir);
  let lastExport = "Never";

  if (files.length > 0) {
    const stats = files.map((file) => {
      const filePath = path.join(exportDir, file);
      return fs.statSync(filePath);
    });

    const mostRecent = stats.reduce((latest, stat) =>
      stat.mtime > latest.mtime ? stat : latest
    );

    lastExport = mostRecent.mtime.toISOString();
  }

  return {
    exportDir,
    totalFiles: files.length,
    lastExport,
  };
}
