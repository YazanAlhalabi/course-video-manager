import { describe, expect, it } from "vitest";
import { uploadReducer, createInitialUploadState } from "./upload-reducer";

const reduce = (state: uploadReducer.State, action: uploadReducer.Action) =>
  uploadReducer(state, action);

const createState = (
  overrides: Partial<uploadReducer.State> = {}
): uploadReducer.State => ({
  ...createInitialUploadState(),
  ...overrides,
});

const createUploadEntry = (
  overrides: Partial<uploadReducer.UploadEntry> = {}
): uploadReducer.UploadEntry => ({
  uploadId: "upload-1",
  videoId: "video-1",
  title: "Test Video",
  progress: 0,
  status: "uploading",
  uploadType: "youtube",
  youtubeVideoId: null,
  bufferStage: null,
  errorMessage: null,
  retryCount: 0,
  ...overrides,
});

describe("uploadReducer", () => {
  describe("START_UPLOAD", () => {
    it("should add a new upload entry", () => {
      const state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "upload-1",
        videoId: "video-1",
        title: "My Video",
      });

      expect(state.uploads["upload-1"]).toEqual({
        uploadId: "upload-1",
        videoId: "video-1",
        title: "My Video",
        progress: 0,
        status: "uploading",
        uploadType: "youtube",
        youtubeVideoId: null,
        bufferStage: null,
        errorMessage: null,
        retryCount: 0,
      });
    });

    it("should not affect existing uploads", () => {
      const existing = createUploadEntry({
        uploadId: "upload-1",
        progress: 50,
      });
      const state = reduce(createState({ uploads: { "upload-1": existing } }), {
        type: "START_UPLOAD",
        uploadId: "upload-2",
        videoId: "video-2",
        title: "Second Video",
      });

      expect(state.uploads["upload-1"]).toEqual(existing);
      expect(state.uploads["upload-2"]).toBeDefined();
    });

    it("should overwrite if same uploadId is started again", () => {
      const existing = createUploadEntry({
        uploadId: "upload-1",
        progress: 50,
        status: "error",
        retryCount: 3,
      });
      const state = reduce(createState({ uploads: { "upload-1": existing } }), {
        type: "START_UPLOAD",
        uploadId: "upload-1",
        videoId: "video-1",
        title: "Restarted Video",
      });

      expect(state.uploads["upload-1"]).toEqual({
        uploadId: "upload-1",
        videoId: "video-1",
        title: "Restarted Video",
        progress: 0,
        status: "uploading",
        uploadType: "youtube",
        youtubeVideoId: null,
        bufferStage: null,
        errorMessage: null,
        retryCount: 0,
      });
    });

    it("should default uploadType to youtube", () => {
      const state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "upload-1",
        videoId: "video-1",
        title: "My Video",
      });

      expect(state.uploads["upload-1"]!.uploadType).toBe("youtube");
      expect(state.uploads["upload-1"]!.bufferStage).toBeNull();
    });

    it("should set uploadType to buffer and initialize bufferStage to copying", () => {
      const state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "upload-1",
        videoId: "video-1",
        title: "Social Post",
        uploadType: "buffer",
      });

      expect(state.uploads["upload-1"]!.uploadType).toBe("buffer");
      expect(state.uploads["upload-1"]!.bufferStage).toBe("copying");
    });
  });

  describe("UPDATE_PROGRESS", () => {
    it("should update progress for existing upload", () => {
      const state = reduce(
        createState({
          uploads: { "upload-1": createUploadEntry() },
        }),
        { type: "UPDATE_PROGRESS", uploadId: "upload-1", progress: 42 }
      );

      expect(state.uploads["upload-1"]!.progress).toBe(42);
    });

    it("should not modify state for non-existent upload", () => {
      const initial = createState();
      const state = reduce(initial, {
        type: "UPDATE_PROGRESS",
        uploadId: "non-existent",
        progress: 50,
      });

      expect(state).toBe(initial);
    });

    it("should not affect other uploads", () => {
      const upload1 = createUploadEntry({
        uploadId: "upload-1",
        progress: 10,
      });
      const upload2 = createUploadEntry({
        uploadId: "upload-2",
        progress: 20,
      });
      const state = reduce(
        createState({
          uploads: { "upload-1": upload1, "upload-2": upload2 },
        }),
        { type: "UPDATE_PROGRESS", uploadId: "upload-1", progress: 75 }
      );

      expect(state.uploads["upload-1"]!.progress).toBe(75);
      expect(state.uploads["upload-2"]!.progress).toBe(20);
    });
  });

  describe("UPDATE_BUFFER_STAGE", () => {
    it("should update buffer stage for existing upload", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              uploadType: "buffer",
              bufferStage: "copying",
            }),
          },
        }),
        { type: "UPDATE_BUFFER_STAGE", uploadId: "upload-1", stage: "syncing" }
      );

      expect(state.uploads["upload-1"]!.bufferStage).toBe("syncing");
    });

    it("should transition from syncing to sending-webhook", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              uploadType: "buffer",
              bufferStage: "syncing",
            }),
          },
        }),
        {
          type: "UPDATE_BUFFER_STAGE",
          uploadId: "upload-1",
          stage: "sending-webhook",
        }
      );

      expect(state.uploads["upload-1"]!.bufferStage).toBe("sending-webhook");
    });

    it("should not modify state for non-existent upload", () => {
      const initial = createState();
      const state = reduce(initial, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "non-existent",
        stage: "syncing",
      });

      expect(state).toBe(initial);
    });
  });

  describe("UPLOAD_SUCCESS", () => {
    it("should set status to success and store youtube video id", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({ progress: 95 }),
          },
        }),
        {
          type: "UPLOAD_SUCCESS",
          uploadId: "upload-1",
          youtubeVideoId: "yt-abc123",
        }
      );

      const upload = state.uploads["upload-1"]!;
      expect(upload.status).toBe("success");
      expect(upload.progress).toBe(100);
      expect(upload.youtubeVideoId).toBe("yt-abc123");
      expect(upload.errorMessage).toBeNull();
    });

    it("should not modify state for non-existent upload", () => {
      const initial = createState();
      const state = reduce(initial, {
        type: "UPLOAD_SUCCESS",
        uploadId: "non-existent",
        youtubeVideoId: "yt-abc",
      });

      expect(state).toBe(initial);
    });

    it("should clear any previous error message", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              errorMessage: "previous error",
              status: "uploading",
            }),
          },
        }),
        {
          type: "UPLOAD_SUCCESS",
          uploadId: "upload-1",
          youtubeVideoId: "yt-abc",
        }
      );

      expect(state.uploads["upload-1"]!.errorMessage).toBeNull();
    });

    it("should work without youtubeVideoId for buffer uploads", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              uploadType: "buffer",
              bufferStage: "sending-webhook",
              progress: 100,
            }),
          },
        }),
        {
          type: "UPLOAD_SUCCESS",
          uploadId: "upload-1",
        }
      );

      const upload = state.uploads["upload-1"]!;
      expect(upload.status).toBe("success");
      expect(upload.progress).toBe(100);
      expect(upload.youtubeVideoId).toBeNull();
      expect(upload.bufferStage).toBeNull();
    });

    it("should clear bufferStage on success", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              uploadType: "buffer",
              bufferStage: "sending-webhook",
            }),
          },
        }),
        {
          type: "UPLOAD_SUCCESS",
          uploadId: "upload-1",
        }
      );

      expect(state.uploads["upload-1"]!.bufferStage).toBeNull();
    });
  });

  describe("UPLOAD_ERROR", () => {
    it("should transition to retrying when retryCount < 3", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({ retryCount: 0 }),
          },
        }),
        {
          type: "UPLOAD_ERROR",
          uploadId: "upload-1",
          errorMessage: "Network error",
        }
      );

      const upload = state.uploads["upload-1"]!;
      expect(upload.status).toBe("retrying");
      expect(upload.retryCount).toBe(1);
      expect(upload.errorMessage).toBe("Network error");
    });

    it("should transition to retrying on second error", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({ retryCount: 1 }),
          },
        }),
        {
          type: "UPLOAD_ERROR",
          uploadId: "upload-1",
          errorMessage: "Network error again",
        }
      );

      const upload = state.uploads["upload-1"]!;
      expect(upload.status).toBe("retrying");
      expect(upload.retryCount).toBe(2);
    });

    it("should transition to error when retryCount reaches 3", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({ retryCount: 2 }),
          },
        }),
        {
          type: "UPLOAD_ERROR",
          uploadId: "upload-1",
          errorMessage: "Final failure",
        }
      );

      const upload = state.uploads["upload-1"]!;
      expect(upload.status).toBe("error");
      expect(upload.retryCount).toBe(3);
      expect(upload.errorMessage).toBe("Final failure");
    });

    it("should not modify state for non-existent upload", () => {
      const initial = createState();
      const state = reduce(initial, {
        type: "UPLOAD_ERROR",
        uploadId: "non-existent",
        errorMessage: "error",
      });

      expect(state).toBe(initial);
    });
  });

  describe("RETRY", () => {
    it("should reset status to uploading and progress to 0", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              status: "retrying",
              retryCount: 1,
              progress: 50,
            }),
          },
        }),
        { type: "RETRY", uploadId: "upload-1" }
      );

      const upload = state.uploads["upload-1"]!;
      expect(upload.status).toBe("uploading");
      expect(upload.progress).toBe(0);
      expect(upload.retryCount).toBe(1);
    });

    it("should not modify state for non-existent upload", () => {
      const initial = createState();
      const state = reduce(initial, {
        type: "RETRY",
        uploadId: "non-existent",
      });

      expect(state).toBe(initial);
    });

    it("should reset bufferStage to copying for buffer uploads", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              uploadType: "buffer",
              bufferStage: "syncing",
              status: "retrying",
              retryCount: 1,
            }),
          },
        }),
        { type: "RETRY", uploadId: "upload-1" }
      );

      expect(state.uploads["upload-1"]!.bufferStage).toBe("copying");
    });

    it("should keep bufferStage null for youtube uploads", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              uploadType: "youtube",
              status: "retrying",
              retryCount: 1,
            }),
          },
        }),
        { type: "RETRY", uploadId: "upload-1" }
      );

      expect(state.uploads["upload-1"]!.bufferStage).toBeNull();
    });
  });

  describe("DISMISS", () => {
    it("should remove upload from state", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              status: "success",
            }),
          },
        }),
        { type: "DISMISS", uploadId: "upload-1" }
      );

      expect(state.uploads["upload-1"]).toBeUndefined();
      expect(Object.keys(state.uploads)).toHaveLength(0);
    });

    it("should not affect other uploads", () => {
      const upload2 = createUploadEntry({
        uploadId: "upload-2",
        videoId: "video-2",
      });
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry(),
            "upload-2": upload2,
          },
        }),
        { type: "DISMISS", uploadId: "upload-1" }
      );

      expect(state.uploads["upload-1"]).toBeUndefined();
      expect(state.uploads["upload-2"]).toEqual(upload2);
    });

    it("should handle dismissing non-existent upload gracefully", () => {
      const upload1 = createUploadEntry();
      const state = reduce(createState({ uploads: { "upload-1": upload1 } }), {
        type: "DISMISS",
        uploadId: "non-existent",
      });

      expect(state.uploads["upload-1"]).toEqual(upload1);
    });

    it("should allow dismissing an upload that is still uploading", () => {
      const state = reduce(
        createState({
          uploads: {
            "upload-1": createUploadEntry({
              status: "uploading",
              progress: 50,
            }),
          },
        }),
        { type: "DISMISS", uploadId: "upload-1" }
      );

      expect(state.uploads["upload-1"]).toBeUndefined();
    });
  });

  describe("multiple concurrent uploads", () => {
    it("should handle starting multiple uploads", () => {
      let state = createState();

      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "upload-1",
        videoId: "video-1",
        title: "First Video",
      });
      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "upload-2",
        videoId: "video-2",
        title: "Second Video",
      });
      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "upload-3",
        videoId: "video-3",
        title: "Third Video",
      });

      expect(Object.keys(state.uploads)).toHaveLength(3);
      expect(state.uploads["upload-1"]!.title).toBe("First Video");
      expect(state.uploads["upload-2"]!.title).toBe("Second Video");
      expect(state.uploads["upload-3"]!.title).toBe("Third Video");
    });

    it("should update progress independently per upload", () => {
      let state = createState({
        uploads: {
          "upload-1": createUploadEntry({ uploadId: "upload-1" }),
          "upload-2": createUploadEntry({ uploadId: "upload-2" }),
        },
      });

      state = reduce(state, {
        type: "UPDATE_PROGRESS",
        uploadId: "upload-1",
        progress: 75,
      });
      state = reduce(state, {
        type: "UPDATE_PROGRESS",
        uploadId: "upload-2",
        progress: 30,
      });

      expect(state.uploads["upload-1"]!.progress).toBe(75);
      expect(state.uploads["upload-2"]!.progress).toBe(30);
    });

    it("should handle mixed statuses across uploads", () => {
      let state = createState({
        uploads: {
          "upload-1": createUploadEntry({ uploadId: "upload-1" }),
          "upload-2": createUploadEntry({ uploadId: "upload-2" }),
          "upload-3": createUploadEntry({
            uploadId: "upload-3",
            retryCount: 2,
          }),
        },
      });

      state = reduce(state, {
        type: "UPLOAD_SUCCESS",
        uploadId: "upload-1",
        youtubeVideoId: "yt-1",
      });
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "upload-2",
        errorMessage: "failed",
      });
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "upload-3",
        errorMessage: "final fail",
      });

      expect(state.uploads["upload-1"]!.status).toBe("success");
      expect(state.uploads["upload-2"]!.status).toBe("retrying");
      expect(state.uploads["upload-3"]!.status).toBe("error");
    });

    it("should handle concurrent youtube and buffer uploads", () => {
      let state = createState();

      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "yt-1",
        videoId: "video-1",
        title: "YouTube Upload",
        uploadType: "youtube",
      });
      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Buffer Post",
        uploadType: "buffer",
      });

      expect(state.uploads["yt-1"]!.uploadType).toBe("youtube");
      expect(state.uploads["yt-1"]!.bufferStage).toBeNull();
      expect(state.uploads["buf-1"]!.uploadType).toBe("buffer");
      expect(state.uploads["buf-1"]!.bufferStage).toBe("copying");

      // Progress YouTube
      state = reduce(state, {
        type: "UPDATE_PROGRESS",
        uploadId: "yt-1",
        progress: 50,
      });
      // Progress Buffer through stages
      state = reduce(state, {
        type: "UPDATE_PROGRESS",
        uploadId: "buf-1",
        progress: 100,
      });
      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "syncing",
      });

      expect(state.uploads["yt-1"]!.progress).toBe(50);
      expect(state.uploads["buf-1"]!.bufferStage).toBe("syncing");

      // Complete both
      state = reduce(state, {
        type: "UPLOAD_SUCCESS",
        uploadId: "yt-1",
        youtubeVideoId: "yt-abc",
      });
      state = reduce(state, {
        type: "UPLOAD_SUCCESS",
        uploadId: "buf-1",
      });

      expect(state.uploads["yt-1"]!.status).toBe("success");
      expect(state.uploads["yt-1"]!.youtubeVideoId).toBe("yt-abc");
      expect(state.uploads["buf-1"]!.status).toBe("success");
      expect(state.uploads["buf-1"]!.youtubeVideoId).toBeNull();
      expect(state.uploads["buf-1"]!.bufferStage).toBeNull();
    });
  });

  describe("full retry lifecycle", () => {
    it("should go through 3 retries then final error", () => {
      let state = createState();

      // Start upload
      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "upload-1",
        videoId: "video-1",
        title: "Flaky Upload",
      });
      expect(state.uploads["upload-1"]!.status).toBe("uploading");

      // First error → retrying (retryCount 1)
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "upload-1",
        errorMessage: "Error 1",
      });
      expect(state.uploads["upload-1"]!.status).toBe("retrying");
      expect(state.uploads["upload-1"]!.retryCount).toBe(1);

      // Context provider would observe "retrying" and call RETRY
      state = reduce(state, { type: "RETRY", uploadId: "upload-1" });
      expect(state.uploads["upload-1"]!.status).toBe("uploading");

      // Second error → retrying (retryCount 2)
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "upload-1",
        errorMessage: "Error 2",
      });
      expect(state.uploads["upload-1"]!.status).toBe("retrying");
      expect(state.uploads["upload-1"]!.retryCount).toBe(2);

      state = reduce(state, { type: "RETRY", uploadId: "upload-1" });
      expect(state.uploads["upload-1"]!.status).toBe("uploading");

      // Third error → final error (retryCount 3)
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "upload-1",
        errorMessage: "Error 3",
      });
      expect(state.uploads["upload-1"]!.status).toBe("error");
      expect(state.uploads["upload-1"]!.retryCount).toBe(3);
      expect(state.uploads["upload-1"]!.errorMessage).toBe("Error 3");
    });

    it("should succeed after retries", () => {
      let state = createState();

      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "upload-1",
        videoId: "video-1",
        title: "Eventually Succeeds",
      });

      // First error → retrying
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "upload-1",
        errorMessage: "Transient error",
      });
      state = reduce(state, { type: "RETRY", uploadId: "upload-1" });

      // Succeeds on retry
      state = reduce(state, {
        type: "UPLOAD_SUCCESS",
        uploadId: "upload-1",
        youtubeVideoId: "yt-success",
      });

      expect(state.uploads["upload-1"]!.status).toBe("success");
      expect(state.uploads["upload-1"]!.youtubeVideoId).toBe("yt-success");
      expect(state.uploads["upload-1"]!.retryCount).toBe(1);
    });
  });

  describe("buffer upload lifecycle", () => {
    it("should progress through all buffer stages to success", () => {
      let state = createState();

      // Start buffer upload
      state = reduce(state, {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Social Post",
        uploadType: "buffer",
      });
      expect(state.uploads["buf-1"]!.bufferStage).toBe("copying");
      expect(state.uploads["buf-1"]!.uploadType).toBe("buffer");

      // Copying progress
      state = reduce(state, {
        type: "UPDATE_PROGRESS",
        uploadId: "buf-1",
        progress: 50,
      });
      expect(state.uploads["buf-1"]!.progress).toBe(50);

      state = reduce(state, {
        type: "UPDATE_PROGRESS",
        uploadId: "buf-1",
        progress: 100,
      });

      // Transition to syncing
      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "syncing",
      });
      expect(state.uploads["buf-1"]!.bufferStage).toBe("syncing");

      // Transition to sending-webhook
      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "sending-webhook",
      });
      expect(state.uploads["buf-1"]!.bufferStage).toBe("sending-webhook");

      // Success
      state = reduce(state, {
        type: "UPLOAD_SUCCESS",
        uploadId: "buf-1",
      });
      expect(state.uploads["buf-1"]!.status).toBe("success");
      expect(state.uploads["buf-1"]!.bufferStage).toBeNull();
      expect(state.uploads["buf-1"]!.progress).toBe(100);
      expect(state.uploads["buf-1"]!.youtubeVideoId).toBeNull();
    });

    it("should handle error during copying stage", () => {
      let state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Failing Copy",
        uploadType: "buffer",
      });

      state = reduce(state, {
        type: "UPDATE_PROGRESS",
        uploadId: "buf-1",
        progress: 30,
      });

      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "buf-1",
        errorMessage: "Disk full",
      });

      expect(state.uploads["buf-1"]!.status).toBe("retrying");
      expect(state.uploads["buf-1"]!.retryCount).toBe(1);
      expect(state.uploads["buf-1"]!.errorMessage).toBe("Disk full");
    });

    it("should handle error during syncing stage", () => {
      let state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Sync Fail",
        uploadType: "buffer",
      });

      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "syncing",
      });

      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "buf-1",
        errorMessage: "Dropbox sync timeout",
      });

      expect(state.uploads["buf-1"]!.status).toBe("retrying");
      expect(state.uploads["buf-1"]!.errorMessage).toBe("Dropbox sync timeout");
    });

    it("should handle error during sending-webhook stage", () => {
      let state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Webhook Fail",
        uploadType: "buffer",
      });

      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "sending-webhook",
      });

      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "buf-1",
        errorMessage: "Zapier webhook failed (500)",
      });

      expect(state.uploads["buf-1"]!.status).toBe("retrying");
    });

    it("should reset bufferStage to copying on retry", () => {
      let state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Retrying Buffer",
        uploadType: "buffer",
      });

      // Advance to syncing then error
      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "syncing",
      });
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "buf-1",
        errorMessage: "Sync error",
      });

      expect(state.uploads["buf-1"]!.status).toBe("retrying");

      // Retry resets to copying
      state = reduce(state, { type: "RETRY", uploadId: "buf-1" });
      expect(state.uploads["buf-1"]!.status).toBe("uploading");
      expect(state.uploads["buf-1"]!.bufferStage).toBe("copying");
      expect(state.uploads["buf-1"]!.progress).toBe(0);
    });

    it("should go through full retry lifecycle for buffer upload", () => {
      let state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Flaky Buffer",
        uploadType: "buffer",
      });

      // First attempt fails during syncing
      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "syncing",
      });
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "buf-1",
        errorMessage: "Error 1",
      });
      expect(state.uploads["buf-1"]!.status).toBe("retrying");

      state = reduce(state, { type: "RETRY", uploadId: "buf-1" });
      expect(state.uploads["buf-1"]!.bufferStage).toBe("copying");

      // Second attempt fails during webhook
      state = reduce(state, {
        type: "UPDATE_BUFFER_STAGE",
        uploadId: "buf-1",
        stage: "sending-webhook",
      });
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "buf-1",
        errorMessage: "Error 2",
      });
      expect(state.uploads["buf-1"]!.status).toBe("retrying");

      state = reduce(state, { type: "RETRY", uploadId: "buf-1" });

      // Third attempt fails → final error
      state = reduce(state, {
        type: "UPLOAD_ERROR",
        uploadId: "buf-1",
        errorMessage: "Error 3",
      });
      expect(state.uploads["buf-1"]!.status).toBe("error");
      expect(state.uploads["buf-1"]!.retryCount).toBe(3);
    });

    it("should dismiss buffer upload", () => {
      let state = reduce(createState(), {
        type: "START_UPLOAD",
        uploadId: "buf-1",
        videoId: "video-1",
        title: "Buffer to Dismiss",
        uploadType: "buffer",
      });

      state = reduce(state, { type: "DISMISS", uploadId: "buf-1" });
      expect(state.uploads["buf-1"]).toBeUndefined();
    });
  });
});
