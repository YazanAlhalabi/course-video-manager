import { DrizzleService } from "@/services/drizzle-service.server";
import { createClipOperations } from "@/services/db-clip-operations.server";
import { createVideoOperations } from "@/services/db-video-operations.server";
import {
  clips,
  lessons,
  links,
  planLessons,
  plans,
  planSections,
  repos,
  repoVersions,
  sections,
  thumbnails,
  videos,
  aiHeroAuth,
  youtubeAuth,
} from "@/db/schema";
import {
  AmbiguousRepoUpdateError,
  CannotDeleteNonLatestVersionError,
  CannotDeleteOnlyVersionError,
  NotFoundError,
  NotLatestVersionError,
  UnknownDBServiceError,
} from "@/services/db-service-errors";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

const makeDbCall = <T>(fn: () => Promise<T>) => {
  return Effect.tryPromise({
    try: fn,
    catch: (e) => new UnknownDBServiceError({ cause: e }),
  });
};

export class DBFunctionsService extends Effect.Service<DBFunctionsService>()(
  "DBFunctionsService",
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleService;

      const {
        getClipById,
        getClipsByIds,
        updateClip,
        archiveClip,
        reorderClip,
        createClipSection,
        createClipSectionAtInsertionPoint,
        createClipSectionAtPosition,
        getClipSectionById,
        updateClipSection,
        archiveClipSection,
        reorderClipSection,
        appendClips,
      } = createClipOperations(db);

      const getRepoById = Effect.fn("getRepoById")(function* (id: string) {
        const repo = yield* makeDbCall(() =>
          db.query.repos.findFirst({
            where: eq(repos.id, id),
          })
        );

        if (!repo) {
          return yield* new NotFoundError({
            type: "getRepo",
            params: { id },
          });
        }

        return repo;
      });

      const getRepoByFilePath = Effect.fn("getRepoByFilePath")(function* (
        filePath: string
      ) {
        const repo = yield* makeDbCall(() =>
          db.query.repos.findFirst({
            where: eq(repos.filePath, filePath),
          })
        );

        if (!repo) {
          return yield* new NotFoundError({
            type: "getRepoByFilePath",
            params: { filePath },
          });
        }

        return repo;
      });

      const getLessonById = Effect.fn("getLessonById")(function* (id: string) {
        const lesson = yield* makeDbCall(() =>
          db.query.lessons.findFirst({
            where: eq(lessons.id, id),
            with: {
              videos: {
                orderBy: asc(videos.path),
              },
            },
          })
        );

        if (!lesson) {
          return yield* new NotFoundError({
            type: "getLessonById",
            params: { id },
          });
        }

        return lesson;
      });

      const getLessonsBySectionId = Effect.fn("getLessonsBySectionId")(
        function* (sectionId: string) {
          return yield* makeDbCall(() =>
            db.query.lessons.findMany({
              where: eq(lessons.sectionId, sectionId),
              orderBy: asc(lessons.order),
            })
          );
        }
      );

      const getLessonWithHierarchyById = Effect.fn(
        "getLessonWithHierarchyById"
      )(function* (id: string) {
        const lesson = yield* makeDbCall(() =>
          db.query.lessons.findFirst({
            where: eq(lessons.id, id),
            with: {
              section: {
                with: {
                  repoVersion: {
                    with: {
                      repo: true,
                    },
                  },
                },
              },
            },
          })
        );

        if (!lesson) {
          return yield* new NotFoundError({
            type: "getLessonWithHierarchyById",
            params: { id },
          });
        }

        return lesson;
      });

      const getSectionWithHierarchyById = Effect.fn(
        "getSectionWithHierarchyById"
      )(function* (id: string) {
        const section = yield* makeDbCall(() =>
          db.query.sections.findFirst({
            where: eq(sections.id, id),
            with: {
              repoVersion: {
                with: {
                  repo: true,
                },
              },
            },
          })
        );

        if (!section) {
          return yield* new NotFoundError({
            type: "getSectionWithHierarchyById",
            params: { id },
          });
        }

        return section;
      });

      const getRepoWithSectionsById = Effect.fn("getRepoWithSectionsById")(
        function* (id: string) {
          const repo = yield* makeDbCall(() =>
            db.query.repos.findFirst({
              where: eq(repos.id, id),
              with: {
                versions: {
                  orderBy: desc(repoVersions.createdAt),
                  with: {
                    sections: {
                      with: {
                        lessons: {
                          with: {
                            videos: {
                              orderBy: asc(videos.path),
                              where: eq(videos.archived, false),
                              with: {
                                clips: {
                                  orderBy: asc(clips.order),
                                  where: eq(clips.archived, false),
                                },
                              },
                            },
                          },
                          orderBy: asc(lessons.order),
                        },
                      },
                      orderBy: asc(sections.order),
                    },
                  },
                },
              },
            })
          );

          if (!repo) {
            return yield* new NotFoundError({
              type: "getRepoWithSections",
              params: { id },
            });
          }

          return repo;
        }
      );

      const {
        getVideoDeepById,
        getStandaloneVideos,
        getAllStandaloneVideos,
        getArchivedStandaloneVideos,
        getVideoWithClipsById,
        createVideo,
        createStandaloneVideo,
        hasOriginalFootagePathAlreadyBeenUsed,
        updateVideo,
        deleteVideo,
        updateVideoPath,
        updateVideoLesson,
        updateVideoArchiveStatus,
        getNextVideoId,
        getPreviousVideoId,
        getNextLessonWithoutVideo,
        getVideosForFewShotExamples,
      } = createVideoOperations(db, { getRepoWithSectionsById });

      return {
        getClipById,
        getClipsByIds,
        updateClip,
        archiveClip,
        reorderClip,
        createClipSection,
        createClipSectionAtInsertionPoint,
        createClipSectionAtPosition,
        getClipSectionById,
        updateClipSection,
        archiveClipSection,
        reorderClipSection,
        appendClips,
        getLessonById,
        getLessonWithHierarchyById,
        getLessonsBySectionId,
        getSectionWithHierarchyById,
        createVideo,
        createStandaloneVideo,
        hasOriginalFootagePathAlreadyBeenUsed,
        updateVideo,
        deleteVideo,
        updateVideoPath,
        updateVideoLesson,
        getRepoById,
        getRepoByFilePath,
        getRepoWithSectionsById,
        getRepoWithSectionsByFilePath: Effect.fn(
          "getRepoWithSectionsByFilePath"
        )(function* (filePath: string) {
          const repo = yield* getRepoByFilePath(filePath);

          return yield* getRepoWithSectionsById(repo.id);
        }),
        getRepos: Effect.fn("getRepos")(function* () {
          const reposResult = yield* makeDbCall(() =>
            db.query.repos.findMany({
              where: eq(repos.archived, false),
            })
          );
          return reposResult;
        }),
        getArchivedRepos: Effect.fn("getArchivedRepos")(function* () {
          const reposResult = yield* makeDbCall(() =>
            db.query.repos.findMany({
              where: eq(repos.archived, true),
            })
          );
          return reposResult;
        }),
        getVideoById: getVideoDeepById,
        getVideoWithClipsById: getVideoWithClipsById,
        getStandaloneVideos,
        getAllStandaloneVideos,
        getArchivedStandaloneVideos,
        createRepo: Effect.fn("createRepo")(function* (input: {
          filePath: string;
          name: string;
        }) {
          const reposResult = yield* makeDbCall(() =>
            db.insert(repos).values(input).returning()
          );

          const repo = reposResult[0];

          if (!repo) {
            return yield* new UnknownDBServiceError({
              cause: "No repo was returned from the database",
            });
          }

          return repo;
        }),
        createSections: Effect.fn("createSections")(function* ({
          sections: newSections,
          repoVersionId,
        }: {
          sections: {
            sectionPathWithNumber: string;
            sectionNumber: number;
          }[];
          repoVersionId: string;
        }) {
          const sectionResult = yield* makeDbCall(() =>
            db
              .insert(sections)
              .values(
                newSections.map((section) => ({
                  repoVersionId,
                  path: section.sectionPathWithNumber,
                  order: section.sectionNumber,
                }))
              )
              .returning()
          );

          return sectionResult;
        }),

        createLessons: Effect.fn("createLessons")(function* (
          sectionId: string,
          newLessons: {
            lessonPathWithNumber: string;
            lessonNumber: number;
          }[]
        ) {
          const lessonResult = yield* makeDbCall(() =>
            db
              .insert(lessons)
              .values(
                newLessons.map((lesson) => ({
                  sectionId,
                  path: lesson.lessonPathWithNumber,
                  order: lesson.lessonNumber,
                }))
              )
              .returning()
          );

          return lessonResult;
        }),
        createGhostLesson: Effect.fn("createGhostLesson")(function* (
          sectionId: string,
          opts: {
            title: string;
            path: string;
            order: number;
          }
        ) {
          const lessonResult = yield* makeDbCall(() =>
            db
              .insert(lessons)
              .values({
                sectionId,
                title: opts.title,
                path: opts.path,
                order: opts.order,
                fsStatus: "ghost",
              })
              .returning()
          );

          return lessonResult;
        }),
        updateLesson: Effect.fn("updateLesson")(function* (
          lessonId: string,
          lesson: {
            path?: string;
            sectionId?: string;
            lessonNumber?: number;
            title?: string;
            fsStatus?: string;
            description?: string;
            dependencies?: string[];
            icon?: string | null;
            priority?: number;
          }
        ) {
          const lessonResult = yield* makeDbCall(() =>
            db
              .update(lessons)
              .set({
                path: lesson.path,
                sectionId: lesson.sectionId,
                order: lesson.lessonNumber,
                title: lesson.title,
                fsStatus: lesson.fsStatus,
                description: lesson.description,
                dependencies: lesson.dependencies,
                icon: lesson.icon,
                priority: lesson.priority,
              })
              .where(eq(lessons.id, lessonId))
          );

          return lessonResult;
        }),
        deleteLesson: Effect.fn("deleteLesson")(function* (lessonId: string) {
          const lessonResult = yield* makeDbCall(() =>
            db.delete(lessons).where(eq(lessons.id, lessonId))
          );

          return lessonResult;
        }),
        deleteSection: Effect.fn("deleteSection")(function* (
          sectionId: string
        ) {
          const sectionResult = yield* makeDbCall(() =>
            db.delete(sections).where(eq(sections.id, sectionId))
          );

          return sectionResult;
        }),
        updateSectionOrder: Effect.fn("updateSectionOrder")(function* (
          sectionId: string,
          order: number
        ) {
          return yield* makeDbCall(() =>
            db.update(sections).set({ order }).where(eq(sections.id, sectionId))
          );
        }),
        updateSectionPath: Effect.fn("updateSectionPath")(function* (
          sectionId: string,
          path: string
        ) {
          return yield* makeDbCall(() =>
            db.update(sections).set({ path }).where(eq(sections.id, sectionId))
          );
        }),
        getSectionsByIds: Effect.fn("getSectionsByIds")(function* (
          ids: readonly string[]
        ) {
          if (ids.length === 0) return [];
          return yield* makeDbCall(() =>
            db.query.sections.findMany({
              where: inArray(sections.id, ids as string[]),
            })
          );
        }),
        getSectionsByRepoVersionId: Effect.fn("getSectionsByRepoVersionId")(
          function* (repoVersionId: string) {
            return yield* makeDbCall(() =>
              db.query.sections.findMany({
                where: eq(sections.repoVersionId, repoVersionId),
                orderBy: asc(sections.order),
              })
            );
          }
        ),
        updateLessonOrder: Effect.fn("updateLessonOrder")(function* (
          lessonId: string,
          order: number
        ) {
          return yield* makeDbCall(() =>
            db.update(lessons).set({ order }).where(eq(lessons.id, lessonId))
          );
        }),
        getNextVideoId,
        getPreviousVideoId,
        getNextLessonWithoutVideo,
        // Version-related methods
        getRepoVersions: Effect.fn("getRepoVersions")(function* (
          repoId: string
        ) {
          const versions = yield* makeDbCall(() =>
            db.query.repoVersions.findMany({
              where: eq(repoVersions.repoId, repoId),
              orderBy: desc(repoVersions.createdAt),
            })
          );
          return versions;
        }),
        getLatestRepoVersion: Effect.fn("getLatestRepoVersion")(function* (
          repoId: string
        ) {
          const version = yield* makeDbCall(() =>
            db.query.repoVersions.findFirst({
              where: eq(repoVersions.repoId, repoId),
              orderBy: desc(repoVersions.createdAt),
            })
          );
          return version;
        }),
        getRepoVersionById: Effect.fn("getRepoVersionById")(function* (
          versionId: string
        ) {
          const version = yield* makeDbCall(() =>
            db.query.repoVersions.findFirst({
              where: eq(repoVersions.id, versionId),
            })
          );

          if (!version) {
            return yield* new NotFoundError({
              type: "getRepoVersionById",
              params: { versionId },
            });
          }

          return version;
        }),
        getRepoWithSectionsByVersion: Effect.fn("getRepoWithSectionsByVersion")(
          function* (opts: { repoId: string; versionId: string }) {
            const { repoId, versionId } = opts;
            const repo = yield* makeDbCall(() =>
              db.query.repos.findFirst({
                where: eq(repos.id, repoId),
              })
            );

            if (!repo) {
              return yield* new NotFoundError({
                type: "getRepoWithSectionsByVersion",
                params: { repoId, versionId },
              });
            }

            const versionSections = yield* makeDbCall(() =>
              db.query.sections.findMany({
                where: eq(sections.repoVersionId, versionId),
                orderBy: asc(sections.order),
                with: {
                  lessons: {
                    orderBy: asc(lessons.order),
                    with: {
                      videos: {
                        orderBy: asc(videos.path),
                        with: {
                          clips: {
                            orderBy: asc(clips.order),
                            where: eq(clips.archived, false),
                          },
                        },
                      },
                    },
                  },
                },
              })
            );

            return {
              ...repo,
              sections: versionSections,
            };
          }
        ),
        getVersionWithSections: Effect.fn("getVersionWithSections")(function* (
          versionId: string
        ) {
          const version = yield* makeDbCall(() =>
            db.query.repoVersions.findFirst({
              where: eq(repoVersions.id, versionId),
              with: {
                repo: true,
                sections: {
                  orderBy: asc(sections.order),
                  with: {
                    lessons: {
                      orderBy: asc(lessons.order),
                      with: {
                        videos: {
                          orderBy: asc(videos.path),
                          with: {
                            clips: {
                              orderBy: asc(clips.order),
                              where: eq(clips.archived, false),
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            })
          );

          if (!version) {
            return yield* new NotFoundError({
              type: "getVersionWithSections",
              params: { versionId },
            });
          }

          return version;
        }),
        createRepoVersion: Effect.fn("createRepoVersion")(function* (input: {
          repoId: string;
          name: string;
        }) {
          const [version] = yield* makeDbCall(() =>
            db.insert(repoVersions).values(input).returning()
          );

          if (!version) {
            return yield* new UnknownDBServiceError({
              cause: "No version was returned from the database",
            });
          }

          return version;
        }),
        updateRepoVersion: Effect.fn("updateRepoVersion")(function* (opts: {
          versionId: string;
          name: string;
          description: string;
        }) {
          const { versionId, name, description } = opts;
          const [updated] = yield* makeDbCall(() =>
            db
              .update(repoVersions)
              .set({ name, description })
              .where(eq(repoVersions.id, versionId))
              .returning()
          );

          if (!updated) {
            return yield* new NotFoundError({
              type: "updateRepoVersion",
              params: { versionId },
            });
          }

          return updated;
        }),
        updateRepoName: Effect.fn("updateRepoName")(function* (opts: {
          repoId: string;
          name: string;
        }) {
          const { repoId, name } = opts;
          const [updated] = yield* makeDbCall(() =>
            db
              .update(repos)
              .set({ name })
              .where(eq(repos.id, repoId))
              .returning()
          );

          if (!updated) {
            return yield* new NotFoundError({
              type: "updateRepoName",
              params: { repoId },
            });
          }

          return updated;
        }),
        updateRepoMemory: Effect.fn("updateRepoMemory")(function* (opts: {
          repoId: string;
          memory: string;
        }) {
          const { repoId, memory } = opts;
          const [updated] = yield* makeDbCall(() =>
            db
              .update(repos)
              .set({ memory })
              .where(eq(repos.id, repoId))
              .returning()
          );

          if (!updated) {
            return yield* new NotFoundError({
              type: "updateRepoMemory",
              params: { repoId },
            });
          }

          return updated;
        }),
        updateRepoArchiveStatus: Effect.fn("updateRepoArchiveStatus")(
          function* (opts: { repoId: string; archived: boolean }) {
            const { repoId, archived } = opts;
            const [updated] = yield* makeDbCall(() =>
              db
                .update(repos)
                .set({ archived })
                .where(eq(repos.id, repoId))
                .returning()
            );

            if (!updated) {
              return yield* new NotFoundError({
                type: "updateRepoArchiveStatus",
                params: { repoId },
              });
            }

            return updated;
          }
        ),
        updateVideoArchiveStatus,
        updateRepoFilePath: Effect.fn("updateRepoFilePath")(function* (opts: {
          repoId: string;
          filePath: string;
        }) {
          const { repoId, filePath } = opts;

          // Check if multiple repos share the current repo's path
          const currentRepo = yield* makeDbCall(() =>
            db.query.repos.findFirst({
              where: eq(repos.id, repoId),
            })
          );

          if (!currentRepo) {
            return yield* new NotFoundError({
              type: "updateRepoFilePath",
              params: { repoId },
            });
          }

          const reposWithSamePath = yield* makeDbCall(() =>
            db.query.repos.findMany({
              where: eq(repos.filePath, currentRepo.filePath),
            })
          );

          if (reposWithSamePath.length > 1) {
            return yield* new AmbiguousRepoUpdateError({
              filePath: currentRepo.filePath,
              repoCount: reposWithSamePath.length,
            });
          }

          const [updated] = yield* makeDbCall(() =>
            db
              .update(repos)
              .set({ filePath })
              .where(eq(repos.id, repoId))
              .returning()
          );

          if (!updated) {
            return yield* new NotFoundError({
              type: "updateRepoFilePath",
              params: { repoId },
            });
          }

          return updated;
        }),
        deleteRepo: Effect.fn("deleteRepo")(function* (repoId: string) {
          yield* makeDbCall(() => db.delete(repos).where(eq(repos.id, repoId)));
        }),
        /**
         * Delete a repo version. Only the latest version can be deleted,
         * and a repo must have at least one version remaining.
         */
        deleteRepoVersion: Effect.fn("deleteRepoVersion")(function* (
          versionId: string
        ) {
          // Get the version to find its repoId
          const version = yield* makeDbCall(() =>
            db.query.repoVersions.findFirst({
              where: eq(repoVersions.id, versionId),
            })
          );

          if (!version) {
            return yield* new NotFoundError({
              type: "deleteRepoVersion",
              params: { versionId },
            });
          }

          // Get all versions for this repo
          const allVersions = yield* makeDbCall(() =>
            db.query.repoVersions.findMany({
              where: eq(repoVersions.repoId, version.repoId),
              orderBy: desc(repoVersions.createdAt),
            })
          );

          // Cannot delete the only version
          if (allVersions.length <= 1) {
            return yield* new CannotDeleteOnlyVersionError({
              versionId,
              repoId: version.repoId,
            });
          }

          // Can only delete the latest version
          const latestVersion = allVersions[0];
          if (!latestVersion || latestVersion.id !== versionId) {
            return yield* new CannotDeleteNonLatestVersionError({
              versionId,
              latestVersionId: latestVersion?.id ?? "none",
            });
          }

          // Delete the version (cascades to sections, lessons, videos, clips)
          yield* makeDbCall(() =>
            db.delete(repoVersions).where(eq(repoVersions.id, versionId))
          );

          // Return the new latest version (second in the original list)
          const newLatestVersion = allVersions[1];
          return newLatestVersion;
        }),
        /**
         * Copy structure from an existing version to a new version.
         * Copies all sections, lessons, videos, and non-archived clips.
         * Sets previousVersionSectionId and previousVersionLessonId for change tracking.
         */
        copyVersionStructure: Effect.fn("copyVersionStructure")(
          function* (input: {
            sourceVersionId: string;
            repoId: string;
            newVersionName: string;
          }) {
            // Verify sourceVersionId is the latest version for this repo
            const latestVersion = yield* makeDbCall(() =>
              db.query.repoVersions.findFirst({
                where: eq(repoVersions.repoId, input.repoId),
                orderBy: desc(repoVersions.createdAt),
              })
            );

            if (!latestVersion || latestVersion.id !== input.sourceVersionId) {
              return yield* new NotLatestVersionError({
                sourceVersionId: input.sourceVersionId,
                latestVersionId: latestVersion?.id ?? "none",
              });
            }

            // Create the new version
            const newVersion = yield* makeDbCall(() =>
              db
                .insert(repoVersions)
                .values({
                  repoId: input.repoId,
                  name: input.newVersionName,
                })
                .returning()
            ).pipe(
              Effect.andThen((arr) => {
                const v = arr[0];
                if (!v) {
                  return Effect.fail(
                    new UnknownDBServiceError({ cause: "No version returned" })
                  );
                }
                return Effect.succeed(v);
              })
            );

            // Get all sections for the source version with their lessons, videos, and clips
            const sourceSections = yield* makeDbCall(() =>
              db.query.sections.findMany({
                where: eq(sections.repoVersionId, input.sourceVersionId),
                orderBy: asc(sections.order),
                with: {
                  lessons: {
                    orderBy: asc(lessons.order),
                    with: {
                      videos: {
                        orderBy: asc(videos.path),
                        with: {
                          clips: {
                            orderBy: asc(clips.order),
                            where: eq(clips.archived, false), // Only non-archived clips
                          },
                        },
                      },
                    },
                  },
                },
              })
            );

            // Track video ID mappings: sourceVideoId -> newVideoId
            const videoIdMappings: Array<{
              sourceVideoId: string;
              newVideoId: string;
            }> = [];

            // Copy each section
            for (const sourceSection of sourceSections) {
              const [newSection] = yield* makeDbCall(() =>
                db
                  .insert(sections)
                  .values({
                    repoVersionId: newVersion.id,
                    previousVersionSectionId: sourceSection.id,
                    path: sourceSection.path,
                    order: sourceSection.order,
                  })
                  .returning()
              );

              if (!newSection) continue;

              // Copy each lesson in the section
              for (const sourceLesson of sourceSection.lessons) {
                const [newLesson] = yield* makeDbCall(() =>
                  db
                    .insert(lessons)
                    .values({
                      sectionId: newSection.id,
                      previousVersionLessonId: sourceLesson.id,
                      path: sourceLesson.path,
                      order: sourceLesson.order,
                      fsStatus: sourceLesson.fsStatus,
                      title: sourceLesson.title,
                      description: sourceLesson.description,
                      icon: sourceLesson.icon,
                      priority: sourceLesson.priority,
                      dependencies: sourceLesson.dependencies,
                    })
                    .returning()
                );

                if (!newLesson) continue;

                // Copy each video in the lesson
                for (const sourceVideo of sourceLesson.videos) {
                  const [newVideo] = yield* makeDbCall(() =>
                    db
                      .insert(videos)
                      .values({
                        lessonId: newLesson.id,
                        path: sourceVideo.path,
                        originalFootagePath: sourceVideo.originalFootagePath,
                      })
                      .returning()
                  );

                  if (!newVideo) continue;

                  // Track the video ID mapping
                  videoIdMappings.push({
                    sourceVideoId: sourceVideo.id,
                    newVideoId: newVideo.id,
                  });

                  // Copy each non-archived clip in the video
                  if (sourceVideo.clips.length > 0) {
                    yield* makeDbCall(() =>
                      db.insert(clips).values(
                        sourceVideo.clips.map((clip) => ({
                          videoId: newVideo.id,
                          videoFilename: clip.videoFilename,
                          sourceStartTime: clip.sourceStartTime,
                          sourceEndTime: clip.sourceEndTime,
                          order: clip.order,
                          archived: false,
                          text: clip.text,
                          transcribedAt: clip.transcribedAt,
                          scene: clip.scene,
                          profile: clip.profile,
                          beatType: clip.beatType,
                        }))
                      )
                    );
                  }
                }
              }
            }

            return { version: newVersion, videoIdMappings };
          }
        ),
        /**
         * Get all video IDs for a specific version.
         */
        getVideoIdsForVersion: Effect.fn("getVideoIdsForVersion")(function* (
          versionId: string
        ) {
          const versionSections = yield* makeDbCall(() =>
            db.query.sections.findMany({
              where: eq(sections.repoVersionId, versionId),
              with: {
                lessons: {
                  with: {
                    videos: {
                      columns: {
                        id: true,
                      },
                    },
                  },
                },
              },
            })
          );

          const videoIds: string[] = [];
          for (const section of versionSections) {
            for (const lesson of section.lessons) {
              for (const video of lesson.videos) {
                videoIds.push(video.id);
              }
            }
          }

          return videoIds;
        }),
        /**
         * Get all versions for a repo with their full structure for changelog generation.
         * Returns versions in reverse chronological order (newest first).
         */
        getAllVersionsWithStructure: Effect.fn("getAllVersionsWithStructure")(
          function* (repoId: string) {
            const versions = yield* makeDbCall(() =>
              db.query.repoVersions.findMany({
                where: eq(repoVersions.repoId, repoId),
                orderBy: desc(repoVersions.createdAt),
              })
            );

            const versionsWithStructure: Array<{
              id: string;
              name: string;
              description: string;
              createdAt: Date;
              sections: Array<{
                id: string;
                path: string;
                previousVersionSectionId: string | null;
                lessons: Array<{
                  id: string;
                  path: string;
                  previousVersionLessonId: string | null;
                  videos: Array<{
                    id: string;
                    path: string;
                    clips: Array<{
                      id: string;
                      text: string;
                    }>;
                  }>;
                }>;
              }>;
            }> = [];

            for (const version of versions) {
              const versionSections = yield* makeDbCall(() =>
                db.query.sections.findMany({
                  where: eq(sections.repoVersionId, version.id),
                  orderBy: asc(sections.order),
                  with: {
                    lessons: {
                      orderBy: asc(lessons.order),
                      with: {
                        videos: {
                          orderBy: asc(videos.path),
                          with: {
                            clips: {
                              orderBy: asc(clips.order),
                              where: eq(clips.archived, false),
                            },
                          },
                        },
                      },
                    },
                  },
                })
              );

              versionsWithStructure.push({
                id: version.id,
                name: version.name,
                description: version.description,
                createdAt: version.createdAt,
                sections: versionSections.map((s) => ({
                  id: s.id,
                  path: s.path,
                  previousVersionSectionId: s.previousVersionSectionId,
                  lessons: s.lessons
                    .filter((l) => l.fsStatus !== "ghost")
                    .map((l) => ({
                      id: l.id,
                      path: l.path,
                      previousVersionLessonId: l.previousVersionLessonId,
                      videos: l.videos.map((v) => ({
                        id: v.id,
                        path: v.path,
                        clips: v.clips.map((c) => ({
                          id: c.id,
                          text: c.text,
                        })),
                      })),
                    })),
                })),
              });
            }

            return versionsWithStructure;
          }
        ),
        // Plan-related methods
        getPlans: Effect.fn("getPlans")(function* () {
          const allPlans = yield* makeDbCall(() =>
            db.query.plans.findMany({
              where: eq(plans.archived, false),
              orderBy: desc(plans.updatedAt),
              with: {
                sections: {
                  orderBy: asc(planSections.order),
                  with: {
                    lessons: {
                      orderBy: asc(planLessons.order),
                    },
                  },
                },
              },
            })
          );

          // Transform to match the Plan type expected by the frontend
          return allPlans.map((plan) => ({
            id: plan.id,
            title: plan.title,
            createdAt: plan.createdAt.toISOString(),
            updatedAt: plan.updatedAt.toISOString(),
            sections: plan.sections.map((section) => ({
              id: section.id,
              title: section.title,
              order: section.order,
              lessons: section.lessons.map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                order: lesson.order,
                description: lesson.description,
                icon: lesson.icon as
                  | "watch"
                  | "code"
                  | "discussion"
                  | undefined,
                status: lesson.status as "todo" | "done" | "maybe" | undefined,
                priority: lesson.priority as 1 | 2 | 3 | undefined,
                dependencies: lesson.dependencies ?? undefined,
              })),
            })),
          }));
        }),
        /**
         * Sync a single plan - deletes the existing plan with given ID and inserts the new one.
         * This is a simple "last write wins" approach for single-user app.
         */
        syncPlan: Effect.fn("syncPlan")(function* (plan: {
          readonly id: string;
          readonly title: string;
          readonly createdAt: string;
          readonly updatedAt: string;
          readonly sections: readonly {
            readonly id: string;
            readonly title: string;
            readonly order: number;
            readonly lessons: readonly {
              readonly id: string;
              readonly title: string;
              readonly order: number;
              readonly description?: string;
              readonly icon?: "watch" | "code" | "discussion" | null;
              readonly status?: "todo" | "done" | "maybe" | null;
              readonly priority?: 1 | 2 | 3 | null;
              readonly dependencies?: readonly string[];
            }[];
          }[];
        }) {
          // Delete the existing plan with this ID (cascades to sections and lessons)
          yield* makeDbCall(() =>
            db.delete(plans).where(eq(plans.id, plan.id))
          );

          // Insert the plan
          yield* makeDbCall(() =>
            db.insert(plans).values({
              id: plan.id,
              title: plan.title,
              createdAt: new Date(plan.createdAt),
              updatedAt: new Date(plan.updatedAt),
            })
          );

          // Insert sections for this plan
          for (const section of plan.sections) {
            yield* makeDbCall(() =>
              db.insert(planSections).values({
                id: section.id,
                planId: plan.id,
                title: section.title,
                order: section.order,
              })
            );

            // Insert lessons for this section
            if (section.lessons.length > 0) {
              yield* makeDbCall(() =>
                db.insert(planLessons).values(
                  section.lessons.map((lesson) => ({
                    id: lesson.id,
                    sectionId: section.id,
                    title: lesson.title,
                    order: lesson.order,
                    description: lesson.description,
                    icon: lesson.icon ?? null,
                    status: lesson.status ?? "todo",
                    priority: lesson.priority ?? 2,
                    dependencies: lesson.dependencies
                      ? [...lesson.dependencies]
                      : null,
                  }))
                )
              );
            }
          }

          return { success: true };
        }),
        /**
         * Delete a plan by ID. Sections and lessons are cascade deleted.
         */
        deletePlan: Effect.fn("deletePlan")(function* (planId: string) {
          yield* makeDbCall(() => db.delete(plans).where(eq(plans.id, planId)));
          return { success: true };
        }),
        /**
         * Rename a plan by ID.
         */
        renamePlan: Effect.fn("renamePlan")(function* (
          planId: string,
          newTitle: string
        ) {
          yield* makeDbCall(() =>
            db
              .update(plans)
              .set({ title: newTitle, updatedAt: new Date() })
              .where(eq(plans.id, planId))
          );
          return { success: true };
        }),
        getArchivedPlans: Effect.fn("getArchivedPlans")(function* () {
          const archivedPlansList = yield* makeDbCall(() =>
            db.query.plans.findMany({
              where: eq(plans.archived, true),
              orderBy: desc(plans.updatedAt),
              with: {
                sections: {
                  orderBy: asc(planSections.order),
                  with: {
                    lessons: {
                      orderBy: asc(planLessons.order),
                    },
                  },
                },
              },
            })
          );

          return archivedPlansList.map((plan) => ({
            id: plan.id,
            title: plan.title,
            createdAt: plan.createdAt.toISOString(),
            updatedAt: plan.updatedAt.toISOString(),
            sections: plan.sections.map((section) => ({
              id: section.id,
              title: section.title,
              order: section.order,
              lessons: section.lessons.map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                order: lesson.order,
                description: lesson.description,
                icon: lesson.icon as
                  | "watch"
                  | "code"
                  | "discussion"
                  | undefined,
                status: lesson.status as "todo" | "done" | "maybe" | undefined,
                priority: lesson.priority as 1 | 2 | 3 | undefined,
                dependencies: lesson.dependencies ?? undefined,
              })),
            })),
          }));
        }),
        updatePlanArchiveStatus: Effect.fn("updatePlanArchiveStatus")(
          function* (opts: { planId: string; archived: boolean }) {
            const { planId, archived } = opts;
            const [updated] = yield* makeDbCall(() =>
              db
                .update(plans)
                .set({ archived })
                .where(eq(plans.id, planId))
                .returning()
            );

            if (!updated) {
              return yield* new NotFoundError({
                type: "updatePlanArchiveStatus",
                params: { planId },
              });
            }

            return updated;
          }
        ),
        // Link-related methods for global link management
        /**
         * Get all links ordered by creation date (newest first).
         */
        getLinks: Effect.fn("getLinks")(function* () {
          const allLinks = yield* makeDbCall(() =>
            db.query.links.findMany({
              orderBy: desc(links.createdAt),
            })
          );
          return allLinks;
        }),
        /**
         * Create a new link.
         */
        createLink: Effect.fn("createLink")(function* (link: {
          title: string;
          url: string;
          description?: string | null;
        }) {
          const [newLink] = yield* makeDbCall(() =>
            db
              .insert(links)
              .values({
                title: link.title,
                url: link.url,
                description: link.description ?? null,
              })
              .returning()
          );

          if (!newLink) {
            return yield* new UnknownDBServiceError({
              cause: "No link was returned from the database",
            });
          }

          return newLink;
        }),
        /**
         * Delete a link by ID.
         */
        deleteLink: Effect.fn("deleteLink")(function* (linkId: string) {
          yield* makeDbCall(() => db.delete(links).where(eq(links.id, linkId)));
          return { success: true };
        }),
        getVideosForFewShotExamples,
        // YouTube OAuth token methods
        /**
         * Get the current YouTube auth tokens (single-user design).
         * Returns null if not authenticated.
         */
        getYoutubeAuth: Effect.fn("getYoutubeAuth")(function* () {
          const auth = yield* makeDbCall(() =>
            db.query.youtubeAuth.findFirst()
          );
          return auth ?? null;
        }),
        /**
         * Upsert YouTube auth tokens. Deletes any existing tokens and inserts new ones.
         * Single-user design: only one set of tokens is stored at a time.
         */
        upsertYoutubeAuth: Effect.fn("upsertYoutubeAuth")(function* (tokens: {
          accessToken: string;
          refreshToken: string;
          expiresAt: Date;
        }) {
          // Delete any existing tokens
          yield* makeDbCall(() => db.delete(youtubeAuth));

          // Insert new tokens
          const [newAuth] = yield* makeDbCall(() =>
            db
              .insert(youtubeAuth)
              .values({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresAt,
              })
              .returning()
          );

          if (!newAuth) {
            return yield* new UnknownDBServiceError({
              cause: "No YouTube auth was returned from the database",
            });
          }

          return newAuth;
        }),
        /**
         * Update the access token and expiry (after refresh).
         */
        updateYoutubeAccessToken: Effect.fn("updateYoutubeAccessToken")(
          function* (tokens: { accessToken: string; expiresAt: Date }) {
            const existing = yield* makeDbCall(() =>
              db.query.youtubeAuth.findFirst()
            );

            if (!existing) {
              return yield* new NotFoundError({
                type: "updateYoutubeAccessToken",
                params: {},
                message: "No YouTube auth found to update",
              });
            }

            const [updated] = yield* makeDbCall(() =>
              db
                .update(youtubeAuth)
                .set({
                  accessToken: tokens.accessToken,
                  expiresAt: tokens.expiresAt,
                  updatedAt: new Date(),
                })
                .where(eq(youtubeAuth.id, existing.id))
                .returning()
            );

            if (!updated) {
              return yield* new NotFoundError({
                type: "updateYoutubeAccessToken",
                params: {},
              });
            }

            return updated;
          }
        ),
        /**
         * Delete YouTube auth tokens (disconnect account).
         */
        deleteYoutubeAuth: Effect.fn("deleteYoutubeAuth")(function* () {
          yield* makeDbCall(() => db.delete(youtubeAuth));
          return { success: true };
        }),
        // AI Hero OAuth token methods
        /**
         * Get the current AI Hero auth token (single-user design).
         * Returns null if not authenticated.
         */
        getAiHeroAuth: Effect.fn("getAiHeroAuth")(function* () {
          const auth = yield* makeDbCall(() => db.query.aiHeroAuth.findFirst());
          return auth ?? null;
        }),
        /**
         * Upsert AI Hero auth token. Deletes any existing token and inserts a new one.
         * Single-user design: only one token is stored at a time.
         */
        upsertAiHeroAuth: Effect.fn("upsertAiHeroAuth")(function* (params: {
          accessToken: string;
          userId: string;
        }) {
          yield* makeDbCall(() => db.delete(aiHeroAuth));

          const [newAuth] = yield* makeDbCall(() =>
            db
              .insert(aiHeroAuth)
              .values({
                accessToken: params.accessToken,
                userId: params.userId,
              })
              .returning()
          );

          if (!newAuth) {
            return yield* new UnknownDBServiceError({
              cause: "No AI Hero auth was returned from the database",
            });
          }

          return newAuth;
        }),
        /**
         * Delete AI Hero auth token (disconnect account).
         */
        deleteAiHeroAuth: Effect.fn("deleteAiHeroAuth")(function* () {
          yield* makeDbCall(() => db.delete(aiHeroAuth));
          return { success: true };
        }),
        getThumbnailsByVideoId: Effect.fn("getThumbnailsByVideoId")(function* (
          videoId: string
        ) {
          return yield* makeDbCall(() =>
            db.query.thumbnails.findMany({
              where: eq(thumbnails.videoId, videoId),
              orderBy: desc(thumbnails.createdAt),
            })
          );
        }),
        createThumbnail: Effect.fn("createThumbnail")(function* (params: {
          videoId: string;
          layers: unknown;
          filePath: string | null;
        }) {
          const [record] = yield* makeDbCall(() =>
            db
              .insert(thumbnails)
              .values({
                videoId: params.videoId,
                layers: params.layers,
                filePath: params.filePath,
              })
              .returning()
          );
          if (!record) {
            return yield* Effect.die("Failed to create thumbnail");
          }
          return record;
        }),
        getThumbnailById: Effect.fn("getThumbnailById")(function* (
          thumbnailId: string
        ) {
          const thumbnail = yield* makeDbCall(() =>
            db.query.thumbnails.findFirst({
              where: eq(thumbnails.id, thumbnailId),
            })
          );

          if (!thumbnail) {
            return yield* new NotFoundError({
              type: "getThumbnailById",
              params: { thumbnailId },
            });
          }

          return thumbnail;
        }),
        updateThumbnail: Effect.fn("updateThumbnail")(function* (
          thumbnailId: string,
          params: {
            layers: unknown;
            filePath: string | null;
          }
        ) {
          const [updated] = yield* makeDbCall(() =>
            db
              .update(thumbnails)
              .set({
                layers: params.layers,
                filePath: params.filePath,
              })
              .where(eq(thumbnails.id, thumbnailId))
              .returning()
          );

          if (!updated) {
            return yield* new NotFoundError({
              type: "updateThumbnail",
              params: { thumbnailId },
            });
          }

          return updated;
        }),
        selectThumbnailForUpload: Effect.fn("selectThumbnailForUpload")(
          function* (thumbnailId: string, videoId: string) {
            // Deselect all thumbnails for this video
            yield* makeDbCall(() =>
              db
                .update(thumbnails)
                .set({ selectedForUpload: false })
                .where(eq(thumbnails.videoId, videoId))
            );
            // Select the chosen one
            const [updated] = yield* makeDbCall(() =>
              db
                .update(thumbnails)
                .set({ selectedForUpload: true })
                .where(eq(thumbnails.id, thumbnailId))
                .returning()
            );
            if (!updated) {
              return yield* new NotFoundError({
                type: "selectThumbnailForUpload",
                params: { thumbnailId },
              });
            }
            return updated;
          }
        ),
        deselectAllThumbnails: Effect.fn("deselectAllThumbnails")(function* (
          videoId: string
        ) {
          yield* makeDbCall(() =>
            db
              .update(thumbnails)
              .set({ selectedForUpload: false })
              .where(eq(thumbnails.videoId, videoId))
          );
        }),
        deleteThumbnail: Effect.fn("deleteThumbnail")(function* (
          thumbnailId: string
        ) {
          const [deleted] = yield* makeDbCall(() =>
            db
              .delete(thumbnails)
              .where(eq(thumbnails.id, thumbnailId))
              .returning()
          );

          if (!deleted) {
            return yield* new NotFoundError({
              type: "deleteThumbnail",
              params: { thumbnailId },
            });
          }

          return deleted;
        }),
      };
    }),
  }
) {}
