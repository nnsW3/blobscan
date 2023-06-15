import {
  type DailyBlobStats,
  type DailyBlockStats,
  type DailyTransactionStats,
  type SingleDailyBlobStats,
  type SingleDailyBlockStats,
  type SingleDailyTransactionStats,
} from "~/types";

export type FormattedDailyBlobStats = {
  days: string[];
  blobs: SingleDailyBlobStats["totalBlobs"][];
  uniqueBlobs: SingleDailyBlobStats["totalUniqueBlobs"][];
  blobSizes: number[];
  avgBlobSizes: SingleDailyBlobStats["avgBlobSize"][];
};

export type FormattedDailyBlockStats = {
  days: string[];
  blocks: SingleDailyBlockStats["totalBlocks"][];
};

export type FormattedDailyTransactionStats = {
  days: string[];
  transactions: SingleDailyTransactionStats["totalTransactions"][];
  uniqueReceivers: SingleDailyTransactionStats["totalUniqueReceivers"][];
  uniqueSenders: SingleDailyTransactionStats["totalUniqueSenders"][];
};

function getDateFromDateTime(date: Date): string {
  return date.toISOString().split("T")[0] as string;
}

export function bytesToKilobytes(bytes: bigint | number): number {
  if (typeof bytes === "bigint") {
    return Number(bytes / BigInt(1000));
  } else {
    return Number(bytes / 1000);
  }
}

export function formatDailyBlobStats(
  stats: DailyBlobStats,
): FormattedDailyBlobStats {
  return stats.reduce<FormattedDailyBlobStats>(
    (
      formattedStats,
      { day, avgBlobSize, totalBlobSize, totalBlobs, totalUniqueBlobs },
    ) => {
      formattedStats.days.push(getDateFromDateTime(day));
      formattedStats.blobs.push(totalBlobs);
      formattedStats.uniqueBlobs.push(totalUniqueBlobs);
      formattedStats.blobSizes.push(bytesToKilobytes(totalBlobSize));
      formattedStats.avgBlobSizes.push(avgBlobSize);

      return formattedStats;
    },
    { days: [], blobs: [], uniqueBlobs: [], blobSizes: [], avgBlobSizes: [] },
  );
}

export function formatDailyBlockStats(
  stats: DailyBlockStats,
): FormattedDailyBlockStats {
  return stats.reduce<FormattedDailyBlockStats>(
    (aggregatedStats, { day, totalBlocks }) => {
      aggregatedStats.days.push(getDateFromDateTime(day));
      aggregatedStats.blocks.push(totalBlocks);

      return aggregatedStats;
    },
    {
      days: [],
      blocks: [],
    },
  );
}

export function formatDailyTransactionStats(
  stats: DailyTransactionStats,
): FormattedDailyTransactionStats {
  return stats.reduce<FormattedDailyTransactionStats>(
    (
      aggregatedStats,
      { day, totalTransactions, totalUniqueReceivers, totalUniqueSenders },
    ) => {
      aggregatedStats.days.push(getDateFromDateTime(day));
      aggregatedStats.transactions.push(totalTransactions);
      aggregatedStats.uniqueReceivers.push(totalUniqueReceivers);
      aggregatedStats.uniqueSenders.push(totalUniqueSenders);

      return aggregatedStats;
    },
    {
      days: [],
      transactions: [],
      uniqueReceivers: [],
      uniqueSenders: [],
    },
  );
}
