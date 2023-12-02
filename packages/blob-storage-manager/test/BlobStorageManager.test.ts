import { beforeAll, describe, expect, it } from "vitest";

import type { BlobStorage } from "@blobscan/db";
import prisma from "@blobscan/db/prisma/__mocks__/client";
import { fixtures } from "@blobscan/test";

import { BlobStorageManager } from "../src/BlobStorageManager";
import {
  GoogleStorageMock as GoogleStorage,
  PostgresStorageMock as PostgresStorage,
  SwarmStorageMock as SwarmStorage,
} from "../src/__mocks__";
import {
  BLOB_DATA,
  BLOB_HASH,
  FILE_URI,
  GOOGLE_STORAGE_CONFIG,
  SWARM_REFERENCE,
  SWARM_STORAGE_CONFIG,
} from "./fixtures";

describe("BlobStorageManager", () => {
  let blobStorageManager: BlobStorageManager;
  let postgresStorage: PostgresStorage;
  let googleStorage: GoogleStorage;
  let swarmStorage: SwarmStorage;

  beforeAll(() => {
    postgresStorage = new PostgresStorage();
    googleStorage = new GoogleStorage(GOOGLE_STORAGE_CONFIG);
    swarmStorage = new SwarmStorage(SWARM_STORAGE_CONFIG);

    blobStorageManager = new BlobStorageManager(
      {
        POSTGRES: postgresStorage,
        GOOGLE: googleStorage,
        SWARM: swarmStorage,
      },
      fixtures.chainId
    );
  });

  describe("constructor", () => {
    it("should throw an error if no blob storages are provided", () => {
      expect(() => new BlobStorageManager({}, fixtures.chainId)).toThrow(
        "No blob storages provided"
      );
    });

    it("should return the correct chain id", async () => {
      expect(blobStorageManager.chainId).toBe(fixtures.chainId);
    });
  });

  describe("getStorage", () => {
    it("should return the correct blob storage for a given name", async () => {
      expect(blobStorageManager.getStorage("POSTGRES")).toEqual(
        postgresStorage
      );

      expect(blobStorageManager.getStorage("GOOGLE")).toEqual(googleStorage);
      expect(blobStorageManager.getStorage("SWARM")).toEqual(swarmStorage);
    });
  });

  describe("getBlob", async () => {
    it("should return the blob data and storage name", async () => {
      const result = await blobStorageManager.getBlob(
        {
          reference: BLOB_HASH,
          storage: "POSTGRES",
        },
        {
          reference: FILE_URI,
          storage: "GOOGLE",
        },
        {
          reference: SWARM_REFERENCE,
          storage: "SWARM",
        }
      );

      expect([
        { data: "0x6d6f636b2d64617461", storage: "POSTGRES" },
        { data: "mock-data", storage: "GOOGLE" },
        { data: "mock-data", storage: "SWARM" },
      ]).toContainEqual(result);
    });

    it("should throw an error if the blob storage is not found", async () => {
      const UNKNOWN_BLOB_HASH = "0x6d6f636b2d64617461";
      const UNKNOWN_FILE_URI = "1/6d/6f/636b2d64617461.txt";
      const UNKNOWN_SWARM_REFERENCE = "123456789abcdef";

      prisma.blobData.findFirstOrThrow.mockRejectedValueOnce(
        new Error("Blob data not found")
      );

      const result = blobStorageManager.getBlob(
        {
          reference: UNKNOWN_BLOB_HASH,
          storage: "POSTGRES",
        },
        {
          reference: UNKNOWN_FILE_URI,
          storage: "GOOGLE",
        },
        {
          reference: UNKNOWN_SWARM_REFERENCE,
          storage: "SWARM",
        }
      );

      await expect(result).rejects.toMatchInlineSnapshot(
        "[Error: Failed to get blob from any of the storages: POSTGRES - Error: Blob data not found, GOOGLE - Error: File not found, SWARM - Error: File not found]"
      );
    });
  });

  describe("storeBlob", () => {
    const blob = { data: BLOB_DATA, versionedHash: BLOB_HASH };
    it("should store the blob in all available storages", async () => {
      const result = await blobStorageManager.storeBlob(blob);

      expect(result.references).matchSnapshot();
      expect(result.errors).toMatchSnapshot();
    });

    it("should store a blob in a specific storage if provided", async () => {
      const selectedStorage: BlobStorage = "POSTGRES";

      const result = await blobStorageManager.storeBlob(blob, {
        selectedStorages: [selectedStorage],
      });

      const blobReference = result.references[0];

      expect(
        result.references.length,
        "Returned blob storage refs length mismatch"
      ).toBe(1);
      expect(blobReference?.reference, "Blob storage ref mismatch").toBe(
        BLOB_HASH
      );
      expect(blobReference?.storage, "Blob storage mismatch").toBe(
        selectedStorage
      );
    });

    it("should throw an error when one of the selected blob storages wasn't found", async () => {
      const selectedStorages: BlobStorage[] = ["POSTGRES", "GOOGLE"];
      const singleStorageBSM = new BlobStorageManager(
        {
          SWARM: swarmStorage,
        },
        fixtures.chainId
      );

      await expect(
        singleStorageBSM.storeBlob(blob, {
          selectedStorages: selectedStorages,
        })
      ).rejects.toMatchInlineSnapshot(
        "[Error: Some of the selected storages are not available: POSTGRES, GOOGLE]"
      );
    });

    it("should return errors for failed uploads", async () => {
      const newHash = "0x6d6f636b2d64617461";
      const blob = { data: "New data", versionedHash: newHash };

      prisma.blobData.upsert.mockRejectedValueOnce(
        new Error("Blob data not found")
      );

      const result = await blobStorageManager.storeBlob(blob);

      expect(result.references).matchSnapshot();
      expect(result.errors).toMatchSnapshot();
    });

    it("should throw an error if all uploads fail", async () => {
      const newBlobStorageManager = new BlobStorageManager(
        {
          POSTGRES: postgresStorage,
        },
        fixtures.chainId
      );

      prisma.blobData.upsert.mockRejectedValueOnce(
        new Error("Blob data not found")
      );

      const blob = { data: "New data", versionedHash: "0x6d6f636b2d64617461" };
      await expect(
        newBlobStorageManager.storeBlob(blob)
      ).rejects.toMatchInlineSnapshot(
        "[Error: Failed to upload blob 0x6d6f636b2d64617461 to any of the storages: POSTGRES: Error: Blob data not found]"
      );
    });
  });
});
